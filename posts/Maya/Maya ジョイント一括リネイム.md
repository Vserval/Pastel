![[スクリーンショット 2026-03-18 204718.avif]]

# ソースコード
```Python
# -*- coding: utf-8 -*-
import maya.cmds as cmds

WINDOW_NAME = "jointBatchRenameToolWindow"


class JointBatchRenameTool(object):
    def __init__(self):
        self.widgets = {}

    def show(self):
        if cmds.window(WINDOW_NAME, exists=True):
            cmds.deleteUI(WINDOW_NAME)

        self.widgets["window"] = cmds.window(
            WINDOW_NAME,
            title="ジョイント一括リネームツール",
            sizeable=True,
            widthHeight=(520, 300),
        )

        main_col = cmds.columnLayout(adjustableColumn=True, rowSpacing=8)

        cmds.text(
            label="現在選択中のジョイントをルートとして、配下を階層順に連番リネームします",
            align="left",
        )

        cmds.separator(height=6, style="in")

        cmds.text(label="現在のルートジョイント", align="left")
        self.widgets["root"] = cmds.textField(editable=False)

        cmds.text(label="サフィックス文字（元の名前を残さない時に使用）", align="left")
        self.widgets["suffix"] = cmds.textField(
            text="joint",
            changeCommand=lambda *_: self.refresh_preview()
        )

        self.widgets["include_root"] = cmds.checkBox(
            label="ルートも含める",
            value=True
        )
        self.widgets["keep_name"] = cmds.checkBox(
            label="元の名前を残す（元の名前_番号）",
            value=False,
            changeCommand=lambda *_: self.refresh_preview()
        )

        cmds.text(label="開始番号", align="left")
        self.widgets["start"] = cmds.intField(
            value=0,
            changeCommand=lambda *_: self.refresh_preview()
        )

        cmds.text(label="プレビュー", align="left")
        self.widgets["preview"] = cmds.textField(editable=False)

        cmds.separator(height=8, style="in")

        cmds.button(label="リネーム実行", command=lambda *_: self.execute())

        cmds.showWindow(self.widgets["window"])
        self.refresh_root()
        self.refresh_preview()

        # 選択変更時にルート表示を自動更新
        if cmds.scriptJob(exists=getattr(self, "selection_job", -1)):
            cmds.scriptJob(kill=self.selection_job, force=True)
        self.selection_job = cmds.scriptJob(
            event=["SelectionChanged", self.on_selection_changed],
            parent=self.widgets["window"]
        )

    def on_selection_changed(self):
        self.refresh_root()
        self.refresh_preview()

    def get_selected_root(self):
        sel = cmds.ls(selection=True, type="joint", long=True)
        if not sel:
            return ""
        return sel[0]

    def refresh_root(self):
        root = self.get_selected_root()
        cmds.textField(self.widgets["root"], e=True, text=root)

    def get_joint_depth(self, joint_path):
        # |root|spine|neck -> depth = 2
        return joint_path.count("|") - 1

    def get_joints(self, root, include_root=True):
        if not root or not cmds.objExists(root):
            return []

        root_long = cmds.ls(root, long=True)[0]
        joints = cmds.listRelatives(root_long, ad=True, type="joint", fullPath=True) or []

        if include_root:
            joints.append(root_long)

        # 浅い階層 -> 深い階層
        joints = sorted(joints, key=lambda x: (self.get_joint_depth(x), x))
        return joints

    def make_new_name(self, joint_path, number, keep_name, suffix_text):
        short_name = joint_path.split("|")[-1]

        if keep_name:
            # 元の名前_番号
            return u"{0}_{1}".format(short_name, number)
        else:
            # サフィックス_番号
            base = suffix_text.strip() if suffix_text.strip() else "joint"
            return u"{0}_{1}".format(base, number)

    def build_rename_plan(self, joints, suffix_text, start_number, keep_name):
        plan = []

        for i, joint in enumerate(joints, start=start_number):
            plan.append({
                "path": joint,
                "new_name": self.make_new_name(joint, i, keep_name, suffix_text),
                "depth": self.get_joint_depth(joint),
            })

        return plan

    def refresh_preview(self):
        self.refresh_root()

        suffix_text = cmds.textField(self.widgets["suffix"], q=True, text=True)
        start = cmds.intField(self.widgets["start"], q=True, value=True)
        keep = cmds.checkBox(self.widgets["keep_name"], q=True, value=True)
        root = cmds.textField(self.widgets["root"], q=True, text=True)

        if keep:
            if root:
                short_name = root.split("|")[-1]
            else:
                short_name = "joint"
            preview_name = u"{0}_{1}".format(short_name, start)
        else:
            base = suffix_text.strip() if suffix_text.strip() else "joint"
            preview_name = u"{0}_{1}".format(base, start)

        cmds.textField(self.widgets["preview"], e=True, text=preview_name)

    def execute(self):
        root = self.get_selected_root()
        self.refresh_root()

        if not root:
            cmds.warning("ルートジョイントを選択してください")
            return

        if not cmds.objExists(root):
            cmds.warning("指定されたルートジョイントが存在しません")
            return

        suffix_text = cmds.textField(self.widgets["suffix"], q=True, text=True)
        start = cmds.intField(self.widgets["start"], q=True, value=True)
        include_root = cmds.checkBox(self.widgets["include_root"], q=True, value=True)
        keep = cmds.checkBox(self.widgets["keep_name"], q=True, value=True)

        joints = self.get_joints(root, include_root)
        if not joints:
            cmds.warning("対象ジョイントが見つかりません")
            return

        # 番号は浅い階層 -> 深い階層で増やす
        rename_plan = self.build_rename_plan(joints, suffix_text, start, keep)

        # 実リネームは深い階層 -> 浅い階層
        # 親を先に変えると子のフルパスが壊れるため
        rename_plan_for_execution = sorted(
            rename_plan,
            key=lambda x: x["depth"],
            reverse=True
        )

        cmds.undoInfo(openChunk=True)
        try:
            for item in rename_plan_for_execution:
                joint_path = item["path"]
                new_name = item["new_name"]

                if not cmds.objExists(joint_path):
                    continue

                cmds.rename(joint_path, new_name)

        except Exception as e:
            cmds.warning(u"リネーム中にエラーが発生しました: {0}".format(e))
            raise
        finally:
            cmds.undoInfo(closeChunk=True)

        self.refresh_root()
        self.refresh_preview()


def show_tool():
    JointBatchRenameTool().show()


show_tool()
```