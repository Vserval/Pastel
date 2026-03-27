使い方はシンプルです。  
**`Assets/Editor/AutoMaterialWindow.cs`** として保存すると、Unity のメニューに **`Tools > Auto Material`** が出ます。そこで FBX、ヒエラルキー側のルート、テクスチャフォルダ、マテリアル出力先フォルダを指定して実行できます。

```C#
using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text;
using UnityEditor;
using UnityEditor.SceneManagement;
using UnityEngine;

namespace AutoMaterialEditorTool
{
    public class AutoMaterialWindowJP232 : EditorWindow
    {
        private const string ToolVersion = "vJP232_SAFE_20260321";
        private const string WindowTitle = "Auto Material";

        private static readonly HashSet<string> ForbiddenAOProperties = new HashSet<string>(StringComparer.OrdinalIgnoreCase)
        {
            "_ShadowStrengthMask",
            "_ShadowBorderMask",
            "_ShadowBlurMask"
        };

        [SerializeField] private UnityEngine.Object targetFbx;
        [SerializeField] private GameObject hierarchyMesh;
        [SerializeField] private DefaultAsset textureFolder;
        [SerializeField] private DefaultAsset exportFolder;

        [Header("AO 設定")]
        [SerializeField] private bool enableAOManualAssign = false;
        [SerializeField] private string aoTexturePropertyName = "";

        [Header("デバッグ")]
        [SerializeField] private bool verboseLog = true;
        [SerializeField] private bool dumpRendererInventory = true;
        [SerializeField] private bool writeReportToFile = true;
        [SerializeField] private bool stopBeforeAssign = false;
        [SerializeField] private bool enableDirectNameAssign = true;
        [SerializeField] private bool enableRendererMappedAssign = true;
        [SerializeField] private bool allowOrderFallback = false;

        [MenuItem("Tool/Auto Material")]
        private static void Open()
        {
            GetWindow<AutoMaterialWindowJP232>(WindowTitle);
        }

        private void OnGUI()
        {
            EditorGUILayout.LabelField("自動マテリアル生成", EditorStyles.boldLabel);
            EditorGUILayout.Space();

            targetFbx = EditorGUILayout.ObjectField("Target FBX", targetFbx, typeof(UnityEngine.Object), false);
            hierarchyMesh = (GameObject)EditorGUILayout.ObjectField("Hierarchy Mesh", hierarchyMesh, typeof(GameObject), true);
            textureFolder = (DefaultAsset)EditorGUILayout.ObjectField("Texture Path", textureFolder, typeof(DefaultAsset), false);
            exportFolder = (DefaultAsset)EditorGUILayout.ObjectField("Export Path", exportFolder, typeof(DefaultAsset), false);

            EditorGUILayout.Space();
            EditorGUILayout.LabelField("AO 設定", EditorStyles.boldLabel);
            enableAOManualAssign = EditorGUILayout.ToggleLeft("AO を手動プロパティ指定で設定する", enableAOManualAssign);

            using (new EditorGUI.DisabledScope(!enableAOManualAssign))
            {
                aoTexturePropertyName = EditorGUILayout.TextField("AO 用プロパティ名", aoTexturePropertyName);
            }

            EditorGUILayout.HelpBox(
                "lilToon 2.3.2 では AO の自動設定は行いません。\n" +
                "_ShadowStrengthMask / _ShadowBorderMask / _ShadowBlurMask には絶対に入れません。\n" +
                "必要な場合だけ、正しい AO 用プロパティ名を手動指定してください。",
                MessageType.Info);

            EditorGUILayout.Space();
            EditorGUILayout.LabelField("デバッグ", EditorStyles.boldLabel);
            verboseLog = EditorGUILayout.ToggleLeft("詳細ログを出す", verboseLog);
            dumpRendererInventory = EditorGUILayout.ToggleLeft("Renderer 一覧を出力する", dumpRendererInventory);
            writeReportToFile = EditorGUILayout.ToggleLeft("レポートを txt 保存する", writeReportToFile);
            stopBeforeAssign = EditorGUILayout.ToggleLeft("割り当て前で停止する", stopBeforeAssign);
            enableDirectNameAssign = EditorGUILayout.ToggleLeft("マテリアル名一致で直接割り当てる", enableDirectNameAssign);
            enableRendererMappedAssign = EditorGUILayout.ToggleLeft("Renderer 対応付けで割り当てる", enableRendererMappedAssign);
            allowOrderFallback = EditorGUILayout.ToggleLeft("順番フォールバックを許可する（調査用）", allowOrderFallback);

            EditorGUILayout.Space();

            using (new EditorGUI.DisabledScope(!CanRun()))
            {
                if (GUILayout.Button("実行", GUILayout.Height(34)))
                {
                    Run();
                }
            }

            if (!CanRun())
            {
                EditorGUILayout.HelpBox(
                    "Target FBX / Hierarchy Mesh / Texture Path / Export Path を設定してください。\n" +
                    "Hierarchy Mesh には基本的に Hierarchy 上のシーンオブジェクトを指定してください。",
                    MessageType.Info);
            }
        }

        private bool CanRun()
        {
            if (targetFbx == null || hierarchyMesh == null || textureFolder == null || exportFolder == null)
                return false;

            string fbxPath = AssetDatabase.GetAssetPath(targetFbx);
            string texPath = AssetDatabase.GetAssetPath(textureFolder);
            string outPath = AssetDatabase.GetAssetPath(exportFolder);

            return !string.IsNullOrEmpty(fbxPath)
                   && fbxPath.EndsWith(".fbx", StringComparison.OrdinalIgnoreCase)
                   && AssetDatabase.IsValidFolder(texPath)
                   && AssetDatabase.IsValidFolder(outPath);
        }

        private void Run()
        {
            string fbxPath = AssetDatabase.GetAssetPath(targetFbx);
            string texturePath = AssetDatabase.GetAssetPath(textureFolder);
            string exportPath = AssetDatabase.GetAssetPath(exportFolder);

            StringBuilder report = new StringBuilder(128 * 1024);
            string runId = DateTime.Now.ToString("yyyyMMdd_HHmmss");

            try
            {
                WriteHeader(report, $"自動マテリアル {ToolVersion}");
                report.AppendLine($"実行ID                 : {runId}");
                report.AppendLine($"Target FBX            : {fbxPath}");
                report.AppendLine($"Hierarchy Mesh        : {(hierarchyMesh != null ? hierarchyMesh.name : "null")}");
                report.AppendLine($"Hierarchy は Asset か : {AssetDatabase.Contains(hierarchyMesh)}");
                report.AppendLine($"Hierarchy Asset Path  : {AssetDatabase.GetAssetPath(hierarchyMesh)}");
                report.AppendLine($"Hierarchy Scene Path  : {(hierarchyMesh != null && hierarchyMesh.scene.IsValid() ? hierarchyMesh.scene.path : "(invalid)")}");
                report.AppendLine($"Texture Path          : {texturePath}");
                report.AppendLine($"Export Path           : {exportPath}");
                report.AppendLine($"AO 手動設定           : {enableAOManualAssign}");
                report.AppendLine($"AO プロパティ名       : {(string.IsNullOrWhiteSpace(aoTexturePropertyName) ? "(未指定)" : aoTexturePropertyName)}");
                report.AppendLine();

                Debug.Log($"[自動マテリアル {ToolVersion}] 実行開始 {runId}");

                Shader lilToonShader = ResolveLilToonShader();
                if (lilToonShader == null)
                {
                    report.AppendLine("[エラー] lilToon シェーダーが見つかりません。");
                    FinishReport(report, exportPath, runId);
                    EditorUtility.DisplayDialog(WindowTitle, "lilToon シェーダーが見つかりません。", "OK");
                    return;
                }

                GameObject sourceFbxRoot = AssetDatabase.LoadAssetAtPath<GameObject>(fbxPath);
                if (sourceFbxRoot == null)
                {
                    report.AppendLine("[エラー] FBX を GameObject として読み込めませんでした。");
                    FinishReport(report, exportPath, runId);
                    EditorUtility.DisplayDialog(WindowTitle, "FBX を読み込めませんでした。", "OK");
                    return;
                }

                if (AssetDatabase.Contains(hierarchyMesh))
                {
                    string hierarchyPath = AssetDatabase.GetAssetPath(hierarchyMesh);
                    if (hierarchyPath.EndsWith(".fbx", StringComparison.OrdinalIgnoreCase) || PrefabUtility.IsPartOfImmutablePrefab(hierarchyMesh))
                    {
                        report.AppendLine("[エラー] Hierarchy Mesh に FBX / Model Prefab が指定されています。");
                        report.AppendLine("[エラー] Hierarchy 上のシーンオブジェクトか、通常の .prefab を指定してください。");
                        FinishReport(report, exportPath, runId);
                        EditorUtility.DisplayDialog(
                            WindowTitle,
                            "Hierarchy Mesh に FBX / Model Prefab アセットが指定されています。\nHierarchy 上のシーンオブジェクトを指定してください。",
                            "OK");
                        return;
                    }
                }

                TextureCatalog catalog = BuildTextureCatalog(texturePath);
                Renderer[] sourceRenderers = sourceFbxRoot.GetComponentsInChildren<Renderer>(true);
                Renderer[] targetRenderers = hierarchyMesh.GetComponentsInChildren<Renderer>(true);

                report.AppendLine($"テクスチャ数            : {catalog.Records.Count}");
                report.AppendLine($"Source Renderer 数    : {sourceRenderers.Length}");
                report.AppendLine($"Target Renderer 数    : {targetRenderers.Length}");
                report.AppendLine();

                if (dumpRendererInventory)
                {
                    DumpRendererInventory(report, "SOURCE RENDERERS", sourceFbxRoot.transform, sourceRenderers);
                    DumpRendererInventory(report, "TARGET RENDERERS", hierarchyMesh.transform, targetRenderers);
                }

                if (sourceRenderers.Length == 0 || targetRenderers.Length == 0)
                {
                    report.AppendLine("[エラー] Source または Target に Renderer がありません。");
                    FinishReport(report, exportPath, runId);
                    EditorUtility.DisplayDialog(WindowTitle, "Renderer が見つかりません。", "OK");
                    return;
                }

                WriteHeader(report, "シェーダー Texture プロパティ確認");
                DumpShaderTextureProperties(report, lilToonShader);

                WriteHeader(report, "マテリアル生成");

                List<Material> sourceMaterials = ExtractSourceMaterialsInOrder(sourceRenderers);
                Dictionary<string, Material> generatedMaterials = new Dictionary<string, Material>(StringComparer.OrdinalIgnoreCase);

                for (int i = 0; i < sourceMaterials.Count; i++)
                {
                    Material srcMat = sourceMaterials[i];
                    if (srcMat == null) continue;

                    if (EditorUtility.DisplayCancelableProgressBar(
                        WindowTitle,
                        $"マテリアル作成中... {srcMat.name}",
                        (float)i / Mathf.Max(1, sourceMaterials.Count)))
                    {
                        report.AppendLine("[情報] キャンセルされました。");
                        break;
                    }

                    string materialName = CleanMaterialName(srcMat.name);
                    Material newMat = CreateOrLoadMaterial(materialName, exportPath, lilToonShader);
                    SetupMaterial(newMat, srcMat, materialName, catalog, exportPath, report);

                    generatedMaterials[materialName] = newMat;
                    EditorUtility.SetDirty(newMat);

                    report.AppendLine($"[生成] key={materialName} asset={AssetDatabase.GetAssetPath(newMat)}");
                }

                report.AppendLine();
                report.AppendLine($"生成マテリアル数 : {generatedMaterials.Count}");
                foreach (var kv in generatedMaterials.OrderBy(x => x.Key))
                {
                    report.AppendLine($"  {kv.Key} => {AssetDatabase.GetAssetPath(kv.Value)}");
                }
                report.AppendLine();

                if (stopBeforeAssign)
                {
                    report.AppendLine("[停止] 割り当て前で停止する = true");
                    FinishReport(report, exportPath, runId);
                    EditorUtility.DisplayDialog(WindowTitle, "ダンプのみ出力しました。Console と report を確認してください。", "OK");
                    return;
                }

                int changedRendererCount = ApplyMaterialsToTarget(sourceFbxRoot, hierarchyMesh, generatedMaterials, report);

                report.AppendLine();
                report.AppendLine($"変更された Renderer 数 : {changedRendererCount}");

                AssetDatabase.SaveAssets();
                AssetDatabase.Refresh();

                FinishReport(report, exportPath, runId);
                EditorUtility.DisplayDialog(WindowTitle, "完了しました。Console と report を確認してください。", "OK");
            }
            catch (Exception ex)
            {
                report.AppendLine();
                report.AppendLine("[例外]");
                report.AppendLine(ex.ToString());
                FinishReport(report, exportPath, runId);
                Debug.LogException(ex);
                EditorUtility.DisplayDialog(WindowTitle, "エラー:\n" + ex.Message, "OK");
            }
            finally
            {
                EditorUtility.ClearProgressBar();
            }
        }

        private int ApplyMaterialsToTarget(
            GameObject sourceFbxRoot,
            GameObject targetRootInput,
            Dictionary<string, Material> generatedMaterials,
            StringBuilder report)
        {
            if (AssetDatabase.Contains(targetRootInput))
            {
                string assetPath = AssetDatabase.GetAssetPath(targetRootInput);
                report.AppendLine($"[割り当て] Target は Prefab Asset: {assetPath}");

                GameObject prefabRoot = PrefabUtility.LoadPrefabContents(assetPath);
                try
                {
                    int changed = AssignToHierarchy(sourceFbxRoot, prefabRoot, generatedMaterials, report);
                    PrefabUtility.SaveAsPrefabAsset(prefabRoot, assetPath);
                    report.AppendLine("[割り当て] Prefab を保存しました。");
                    return changed;
                }
                finally
                {
                    PrefabUtility.UnloadPrefabContents(prefabRoot);
                }
            }

            report.AppendLine($"[割り当て] Target は Scene Object: {targetRootInput.name}");
            int changedScene = AssignToHierarchy(sourceFbxRoot, targetRootInput, generatedMaterials, report);

            if (targetRootInput.scene.IsValid())
            {
                EditorSceneManager.MarkSceneDirty(targetRootInput.scene);
                report.AppendLine($"[割り当て] Scene を dirty にしました: {targetRootInput.scene.path}");
            }

            return changedScene;
        }

        private int AssignToHierarchy(
            GameObject sourceRoot,
            GameObject targetRoot,
            Dictionary<string, Material> generatedMaterials,
            StringBuilder report)
        {
            Renderer[] sourceRenderers = sourceRoot.GetComponentsInChildren<Renderer>(true);
            Renderer[] targetRenderers = targetRoot.GetComponentsInChildren<Renderer>(true);

            List<RendererEntry> sourceEntries = sourceRenderers
                .Select((r, i) => CreateRendererEntry(sourceRoot.transform, r, i))
                .ToList();

            List<RendererEntry> targetEntries = targetRenderers
                .Select((r, i) => CreateRendererEntry(targetRoot.transform, r, i))
                .ToList();

            int changedRendererCount = 0;
            int directAssignCount = 0;
            int mappedAssignCount = 0;

            WriteHeader(report, "割り当て PASS 1 : Target の現在マテリアル名で直接差し替え");

            if (enableDirectNameAssign)
            {
                foreach (Renderer targetRenderer in targetRenderers)
                {
                    Material[] before = targetRenderer.sharedMaterials ?? Array.Empty<Material>();
                    Material[] after = CloneMaterialArray(before);
                    bool changed = false;

                    report.AppendLine($"[PASS1][Target] {DescribeRenderer(targetRoot.transform, targetRenderer)}");

                    for (int i = 0; i < after.Length; i++)
                    {
                        Material cur = after[i];
                        string curName = cur != null ? CleanMaterialName(cur.name) : "null";
                        report.AppendLine($"  slot[{i}] 現在={curName}");

                        if (cur == null) continue;

                        if (generatedMaterials.TryGetValue(curName, out Material generated))
                        {
                            if (after[i] != generated)
                            {
                                after[i] = generated;
                                changed = true;
                                directAssignCount++;
                                report.AppendLine($"    -> 生成マテリアルへ置換: {generated.name}");
                            }
                        }
                    }

                    if (changed)
                    {
                        if (ApplyRendererMaterials(targetRenderer, after, report, "PASS1"))
                        {
                            changedRendererCount++;
                        }
                    }
                }
            }
            else
            {
                report.AppendLine("[PASS1] スキップ");
            }

            WriteHeader(report, "割り当て PASS 2 : Source 対応付け + 候補ランキング");

            if (enableRendererMappedAssign)
            {
                HashSet<int> usedSourceIndices = new HashSet<int>();

                foreach (RendererEntry target in targetEntries)
                {
                    report.AppendLine($"[Target] {target.RelativePathNoRoot} / mesh:{target.MeshName} / slots:{target.MaterialSlotCount}");
                    List<RendererCandidate> candidates = RankSourceCandidates(target, sourceEntries, usedSourceIndices);

                    foreach (RendererCandidate c in candidates.Take(5))
                    {
                        report.AppendLine(
                            $"  [候補] score={c.Score}, sourceIndex={c.Source.Index}, " +
                            $"path={c.Source.RelativePathNoRoot}, mesh={c.Source.MeshName}, slots={c.Source.MaterialSlotCount}, reason={c.Reason}");
                    }

                    RendererCandidate best = candidates.FirstOrDefault();
                    if (best == null)
                    {
                        report.AppendLine("  -> 候補なし");
                        continue;
                    }

                    if (best.Score < 1000 && !allowOrderFallback)
                    {
                        report.AppendLine($"  -> 棄却（スコア不足）: {best.Score}");
                        continue;
                    }

                    RendererEntry source = best.Source;
                    usedSourceIndices.Add(source.Index);

                    Material[] sourceShared = source.Renderer.sharedMaterials ?? Array.Empty<Material>();
                    Material[] targetShared = target.Renderer.sharedMaterials ?? Array.Empty<Material>();
                    int slotCount = Mathf.Max(sourceShared.Length, targetShared.Length);
                    Material[] after = new Material[slotCount];
                    bool anyChanged = false;

                    for (int slot = 0; slot < slotCount; slot++)
                    {
                        Material targetMat = slot < targetShared.Length ? targetShared[slot] : null;
                        Material sourceMat = slot < sourceShared.Length ? sourceShared[slot] : null;

                        after[slot] = targetMat;

                        if (targetMat != null)
                        {
                            string tn = CleanMaterialName(targetMat.name);
                            if (generatedMaterials.ContainsKey(tn))
                            {
                                continue;
                            }
                        }

                        if (sourceMat == null)
                        {
                            continue;
                        }

                        string sourceMatName = CleanMaterialName(sourceMat.name);
                        if (generatedMaterials.TryGetValue(sourceMatName, out Material generatedMat))
                        {
                            if (after[slot] != generatedMat)
                            {
                                after[slot] = generatedMat;
                                anyChanged = true;
                                mappedAssignCount++;
                            }
                        }
                    }

                    if (anyChanged && !MaterialsEqual(targetShared, after))
                    {
                        if (ApplyRendererMaterials(target.Renderer, after, report, "PASS2"))
                        {
                            changedRendererCount++;
                        }
                    }
                }
            }
            else
            {
                report.AppendLine("[PASS2] スキップ");
            }

            WriteHeader(report, "割り当て結果まとめ");
            report.AppendLine($"直接割り当て数         : {directAssignCount}");
            report.AppendLine($"対応付け割り当て数     : {mappedAssignCount}");
            report.AppendLine($"変更された Renderer 数 : {changedRendererCount}");

            return changedRendererCount;
        }

        private void SetupMaterial(
            Material dstMat,
            Material srcMat,
            string materialName,
            TextureCatalog catalog,
            string exportFolderPath,
            StringBuilder report)
        {
            if (dstMat == null) return;

            dstMat.shader = ResolveLilToonShader();

            Color sourceColor = ExtractSourceColor(srcMat);
            SetColorSafe(dstMat, "_Color", sourceColor);

            Texture2D baseColor = FindBestTexture(
                catalog,
                materialName,
                new[] { "basecolor", "base color", "base_color", "albedo", "basecol" });

            if (baseColor != null)
            {
                baseColor = PrepareColorTexture(baseColor);
                SetTextureSafe(dstMat, "_MainTex", baseColor);
                report.AppendLine($"[設定][{materialName}] BaseColor => {AssetDatabase.GetAssetPath(baseColor)}");
            }
            else
            {
                report.AppendLine($"[設定][{materialName}] BaseColor 未検出");
            }

            Texture2D normal = FindBestTexture(
                catalog,
                materialName,
                new[] { "normal", "normalgl", "normaldx", "nrm" });

            if (normal != null)
            {
                normal = PrepareNormalTexture(normal);
                SetFloatSafe(dstMat, "_UseBumpMap", 1f);
                SetFloatSafe(dstMat, "_BumpScale", 1f);
                SetTextureSafe(dstMat, "_BumpMap", normal);
                report.AppendLine($"[設定][{materialName}] Normal => {AssetDatabase.GetAssetPath(normal)}");
            }
            else
            {
                report.AppendLine($"[設定][{materialName}] Normal 未検出");
            }

            Texture2D ao = FindBestTexture(
                catalog,
                materialName,
                new[] { "ambientocclusion", "occlusion", "_ao", "-ao", " ao", "ao" });

            if (ao != null)
            {
                ao = PrepareLinearTexture(ao);

                if (enableAOManualAssign)
                {
                    string usedProperty;
                    if (TryAssignAOManual(dstMat, ao, out usedProperty))
                    {
                        report.AppendLine($"[設定][{materialName}] AO => {AssetDatabase.GetAssetPath(ao)} / property={usedProperty}");
                    }
                    else
                    {
                        report.AppendLine($"[警告][{materialName}] AO は見つかりましたが未設定です。手動指定プロパティを確認してください。");
                    }
                }
                else
                {
                    report.AppendLine($"[設定][{materialName}] AO は見つかりましたが、2.3.2 では自動設定しないため未設定です。");
                }
            }
            else
            {
                report.AppendLine($"[設定][{materialName}] AO 未検出");
            }

            Texture2D roughness = FindBestTexture(
                catalog,
                materialName,
                new[] { "roughness", "rough" });

            if (roughness != null)
            {
                Texture2D smoothness = CreateInvertedRoughnessTexture(
                    roughness,
                    exportFolderPath,
                    materialName + "_SmoothnessFromRoughness");

                SetFloatSafe(dstMat, "_UseReflection", 1f);
                SetFloatSafe(dstMat, "_ApplyReflection", 1f);
                SetFloatSafe(dstMat, "_ApplySpecular", 1f);
                SetFloatSafe(dstMat, "_ApplySpecularFA", 1f);
                SetFloatSafe(dstMat, "_SpecularToon", 0f);
                SetFloatSafe(dstMat, "_Smoothness", 1f);
                SetTextureSafe(dstMat, "_SmoothnessTex", smoothness);

                report.AppendLine($"[設定][{materialName}] Roughness => {AssetDatabase.GetAssetPath(roughness)}");
                report.AppendLine($"[設定][{materialName}] Smoothness => {AssetDatabase.GetAssetPath(smoothness)}");
            }
            else
            {
                report.AppendLine($"[設定][{materialName}] Roughness 未検出");
            }

            Texture2D metallic = FindBestTexture(
                catalog,
                materialName,
                new[] { "metallic", "metalness", "metalli", "metal" });

            if (metallic != null)
            {
                metallic = PrepareLinearTexture(metallic);
                SetFloatSafe(dstMat, "_UseReflection", 1f);
                SetFloatSafe(dstMat, "_ApplyReflection", 1f);
                SetFloatSafe(dstMat, "_ApplySpecular", 1f);
                SetFloatSafe(dstMat, "_ApplySpecularFA", 1f);
                SetFloatSafe(dstMat, "_SpecularToon", 0f);
                SetFloatSafe(dstMat, "_Metallic", 1f);
                SetTextureSafe(dstMat, "_MetallicGlossMap", metallic);
                report.AppendLine($"[設定][{materialName}] Metallic => {AssetDatabase.GetAssetPath(metallic)}");
            }
            else
            {
                report.AppendLine($"[設定][{materialName}] Metallic 未検出");
            }

            SetColorSafe(dstMat, "_Color", sourceColor);
        }

        private bool TryAssignAOManual(Material mat, Texture2D aoTexture, out string usedProperty)
        {
            usedProperty = null;

            if (string.IsNullOrWhiteSpace(aoTexturePropertyName))
                return false;

            if (ForbiddenAOProperties.Contains(aoTexturePropertyName))
                return false;

            if (!mat.HasProperty(aoTexturePropertyName))
                return false;

            mat.SetTexture(aoTexturePropertyName, aoTexture);
            usedProperty = aoTexturePropertyName;
            return true;
        }

        private static bool ApplyRendererMaterials(Renderer renderer, Material[] newShared, StringBuilder report, string tag)
        {
            Material[] before = renderer.sharedMaterials ?? Array.Empty<Material>();

            report.AppendLine($"[{tag}][適用確認][Before] {GetMaterialArrayString(before)}");
            report.AppendLine($"[{tag}][適用確認][After ] {GetMaterialArrayString(newShared)}");

            Undo.RecordObject(renderer, "Auto Material 割り当て");
            renderer.sharedMaterials = newShared;
            EditorUtility.SetDirty(renderer);

            if (PrefabUtility.IsPartOfPrefabInstance(renderer))
            {
                PrefabUtility.RecordPrefabInstancePropertyModifications(renderer);
                GameObject root = PrefabUtility.GetOutermostPrefabInstanceRoot(renderer.gameObject);
                if (root != null)
                {
                    PrefabUtility.RecordPrefabInstancePropertyModifications(root);
                }
                report.AppendLine($"[{tag}][適用確認] Prefab インスタンス変更を記録");
            }

            if (renderer.gameObject.scene.IsValid() && renderer.gameObject.scene.isLoaded)
            {
                EditorSceneManager.MarkSceneDirty(renderer.gameObject.scene);
                report.AppendLine($"[{tag}][適用確認] Scene を dirty に設定");
            }

            Material[] verify = renderer.sharedMaterials ?? Array.Empty<Material>();
            bool changed = !MaterialsEqual(before, verify);

            report.AppendLine($"[{tag}][適用確認][Verify] {GetMaterialArrayString(verify)}");
            report.AppendLine($"[{tag}][適用確認][結果] changed={changed}");

            return changed;
        }

        private static List<RendererCandidate> RankSourceCandidates(
            RendererEntry target,
            List<RendererEntry> sources,
            HashSet<int> usedSourceIndices)
        {
            List<RendererCandidate> list = new List<RendererCandidate>();

            foreach (RendererEntry source in sources)
            {
                if (usedSourceIndices.Contains(source.Index))
                    continue;

                int score = 0;
                StringBuilder reason = new StringBuilder();

                if (!string.IsNullOrEmpty(target.RelativePathNoRoot) &&
                    string.Equals(source.RelativePathNoRoot, target.RelativePathNoRoot, StringComparison.OrdinalIgnoreCase))
                {
                    score += 10000;
                    reason.Append("exact-path ");
                }

                if (EndsWithPath(source.RelativePathNoRoot, target.RelativePathNoRoot) ||
                    EndsWithPath(target.RelativePathNoRoot, source.RelativePathNoRoot))
                {
                    score += 3000;
                    reason.Append("suffix-path ");
                }

                if (SameMeshName(source.MeshName, target.MeshName))
                {
                    score += 6000;
                    reason.Append("mesh ");
                }

                if (source.MaterialSlotCount == target.MaterialSlotCount)
                {
                    score += 2000;
                    reason.Append("slotcount ");
                }

                if (string.Equals(source.Renderer.name, target.Renderer.name, StringComparison.OrdinalIgnoreCase))
                {
                    score += 1000;
                    reason.Append("renderer-name ");
                }

                int pathPenalty = PathDistanceScore(source.RelativePathNoRoot, target.RelativePathNoRoot);
                score -= pathPenalty * 10;

                if (score > 0)
                {
                    list.Add(new RendererCandidate
                    {
                        Source = source,
                        Score = score,
                        Reason = reason.ToString().Trim()
                    });
                }
            }

            return list
                .OrderByDescending(x => x.Score)
                .ThenBy(x => x.Source.Index)
                .ToList();
        }

        private static void DumpRendererInventory(StringBuilder report, string title, Transform root, Renderer[] renderers)
        {
            WriteHeader(report, title);

            if (renderers == null || renderers.Length == 0)
            {
                report.AppendLine("(none)");
                report.AppendLine();
                return;
            }

            for (int i = 0; i < renderers.Length; i++)
            {
                report.AppendLine($"[{i}] {DescribeRenderer(root, renderers[i])}");
            }

            report.AppendLine();
        }

        private static void DumpShaderTextureProperties(StringBuilder report, Shader shader)
        {
            if (shader == null)
            {
                report.AppendLine("Shader が null です。");
                return;
            }

            try
            {
                int count = ShaderUtil.GetPropertyCount(shader);
                report.AppendLine($"Shader 名: {shader.name}");
                report.AppendLine("Texture プロパティ一覧:");

                for (int i = 0; i < count; i++)
                {
                    if (ShaderUtil.GetPropertyType(shader, i) == ShaderUtil.ShaderPropertyType.TexEnv)
                    {
                        report.AppendLine($"  - {ShaderUtil.GetPropertyName(shader, i)} ({ShaderUtil.GetPropertyDescription(shader, i)})");
                    }
                }

                report.AppendLine();
            }
            catch (Exception ex)
            {
                report.AppendLine($"Shader プロパティ取得失敗: {ex.Message}");
                report.AppendLine();
            }
        }

        private static string DescribeRenderer(Transform root, Renderer renderer)
        {
            string path = GetHierarchyPath(root, renderer.transform);
            string relPath = GetRelativePathWithoutRoot(root, renderer.transform);
            string meshName = GetMeshName(renderer);
            string typeName = renderer.GetType().Name;
            int slots = renderer.sharedMaterials != null ? renderer.sharedMaterials.Length : 0;
            string mats = GetMaterialArrayString(renderer.sharedMaterials ?? Array.Empty<Material>());

            return $"type={typeName}, path={path}, rel={relPath}, mesh={meshName}, slots={slots}, mats={mats}";
        }

        private static string GetMaterialArrayString(Material[] materials)
        {
            if (materials == null) return "(null)";
            if (materials.Length == 0) return "[]";

            StringBuilder sb = new StringBuilder();
            sb.Append("[");

            for (int i = 0; i < materials.Length; i++)
            {
                if (i > 0) sb.Append(", ");
                sb.Append(i).Append(":");
                sb.Append(materials[i] != null ? CleanMaterialName(materials[i].name) : "null");
            }

            sb.Append("]");
            return sb.ToString();
        }

        private static Material[] CloneMaterialArray(Material[] source)
        {
            if (source == null) return Array.Empty<Material>();
            Material[] clone = new Material[source.Length];
            Array.Copy(source, clone, source.Length);
            return clone;
        }

        private static bool MaterialsEqual(Material[] a, Material[] b)
        {
            if (ReferenceEquals(a, b)) return true;
            if (a == null || b == null) return false;
            if (a.Length != b.Length) return false;

            for (int i = 0; i < a.Length; i++)
            {
                if (a[i] != b[i]) return false;
            }

            return true;
        }

        private static RendererEntry CreateRendererEntry(Transform root, Renderer renderer, int index)
        {
            return new RendererEntry
            {
                Index = index,
                Renderer = renderer,
                RelativePathNoRoot = GetRelativePathWithoutRoot(root, renderer.transform),
                MeshName = GetMeshName(renderer),
                MaterialSlotCount = renderer.sharedMaterials != null ? renderer.sharedMaterials.Length : 0
            };
        }

        private static string GetMeshName(Renderer renderer)
        {
            if (renderer is SkinnedMeshRenderer smr)
            {
                return smr.sharedMesh != null ? smr.sharedMesh.name : string.Empty;
            }

            if (renderer is MeshRenderer)
            {
                MeshFilter mf = renderer.GetComponent<MeshFilter>();
                return mf != null && mf.sharedMesh != null ? mf.sharedMesh.name : string.Empty;
            }

            return string.Empty;
        }

        private static bool SameMeshName(string a, string b)
        {
            if (string.IsNullOrEmpty(a) || string.IsNullOrEmpty(b))
                return false;

            return string.Equals(a, b, StringComparison.OrdinalIgnoreCase);
        }

        private static bool EndsWithPath(string fullPath, string suffixPath)
        {
            if (string.IsNullOrEmpty(fullPath) || string.IsNullOrEmpty(suffixPath))
                return false;

            string a = NormalizePath(fullPath);
            string b = NormalizePath(suffixPath);

            return a == b || a.EndsWith("/" + b, StringComparison.OrdinalIgnoreCase);
        }

        private static int PathDistanceScore(string a, string b)
        {
            string[] aa = NormalizePath(a).Split(new[] { '/' }, StringSplitOptions.RemoveEmptyEntries);
            string[] bb = NormalizePath(b).Split(new[] { '/' }, StringSplitOptions.RemoveEmptyEntries);

            int sameTail = 0;
            int ai = aa.Length - 1;
            int bi = bb.Length - 1;

            while (ai >= 0 && bi >= 0)
            {
                if (!string.Equals(aa[ai], bb[bi], StringComparison.OrdinalIgnoreCase))
                    break;

                sameTail++;
                ai--;
                bi--;
            }

            return (aa.Length + bb.Length) - (sameTail * 2);
        }

        private static string NormalizePath(string path)
        {
            if (string.IsNullOrEmpty(path)) return string.Empty;
            return path.Replace("\\", "/").Trim('/');
        }

        private static string GetHierarchyPath(Transform root, Transform current)
        {
            if (root == null || current == null) return string.Empty;
            if (current == root) return current.name;

            Stack<string> stack = new Stack<string>();
            Transform t = current;

            while (t != null && t != root)
            {
                stack.Push(t.name);
                t = t.parent;
            }

            if (t == root)
                stack.Push(root.name);

            return string.Join("/", stack.ToArray());
        }

        private static string GetRelativePathWithoutRoot(Transform root, Transform current)
        {
            if (current == root) return string.Empty;

            Stack<string> stack = new Stack<string>();
            Transform t = current;

            while (t != null && t != root)
            {
                stack.Push(t.name);
                t = t.parent;
            }

            return string.Join("/", stack.ToArray());
        }

        private static Shader ResolveLilToonShader()
        {
            Shader shader = Shader.Find("lilToon");
            if (shader != null) return shader;
            return Shader.Find("_lil/lilToon");
        }

        private static List<Material> ExtractSourceMaterialsInOrder(IEnumerable<Renderer> renderers)
        {
            List<Material> result = new List<Material>();
            HashSet<string> seen = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

            foreach (Renderer renderer in renderers)
            {
                foreach (Material mat in renderer.sharedMaterials)
                {
                    if (mat == null) continue;

                    string cleanName = CleanMaterialName(mat.name);
                    if (seen.Add(cleanName))
                    {
                        result.Add(mat);
                    }
                }
            }

            return result;
        }

        private static Material CreateOrLoadMaterial(string materialName, string exportFolderPath, Shader shader)
        {
            string fileName = SanitizeFileName(materialName);
            string materialPath = $"{exportFolderPath}/{fileName}.mat";

            Material material = AssetDatabase.LoadAssetAtPath<Material>(materialPath);
            if (material == null)
            {
                material = new Material(shader);
                material.name = materialName;
                AssetDatabase.CreateAsset(material, materialPath);
            }
            else
            {
                material.shader = shader;
                material.name = materialName;
            }

            return material;
        }

        private static TextureCatalog BuildTextureCatalog(string folderPath)
        {
            string[] guids = AssetDatabase.FindAssets("t:Texture2D", new[] { folderPath });
            List<TextureRecord> records = new List<TextureRecord>();

            foreach (string guid in guids)
            {
                string assetPath = AssetDatabase.GUIDToAssetPath(guid);
                Texture2D tex = AssetDatabase.LoadAssetAtPath<Texture2D>(assetPath);
                if (tex == null) continue;

                string fileName = Path.GetFileNameWithoutExtension(assetPath);

                records.Add(new TextureRecord
                {
                    Texture = tex,
                    AssetPath = assetPath,
                    LowerName = fileName.ToLowerInvariant(),
                    NormalizedName = Normalize(fileName)
                });
            }

            return new TextureCatalog { Records = records };
        }

        private static Texture2D FindBestTexture(TextureCatalog catalog, string materialName, IEnumerable<string> keywords)
        {
            string matNorm = Normalize(materialName);

            TextureRecord best = null;
            int bestScore = 0;

            foreach (TextureRecord record in catalog.Records)
            {
                int score = Score(record, matNorm, keywords);
                if (score > bestScore)
                {
                    bestScore = score;
                    best = record;
                }
            }

            return best != null ? best.Texture : null;
        }

        private static int Score(TextureRecord record, string normalizedMaterialName, IEnumerable<string> keywords)
        {
            if (string.IsNullOrEmpty(normalizedMaterialName)) return 0;
            if (!record.NormalizedName.Contains(normalizedMaterialName)) return 0;

            bool keywordMatched = false;
            int score = 100;

            foreach (string keyword in keywords)
            {
                string keyNorm = Normalize(keyword);
                string keyLower = keyword.ToLowerInvariant();

                if ((!string.IsNullOrEmpty(keyNorm) && record.NormalizedName.Contains(keyNorm)) ||
                    (!string.IsNullOrEmpty(keyLower) && record.LowerName.Contains(keyLower)))
                {
                    keywordMatched = true;
                    score += 25;
                }
            }

            if (!keywordMatched) return 0;

            score -= record.LowerName.Length / 8;
            return score;
        }

        private static Texture2D PrepareColorTexture(Texture2D tex)
        {
            return ReimportTexture(tex, importer =>
            {
                importer.textureType = TextureImporterType.Default;
                importer.sRGBTexture = true;
            });
        }

        private static Texture2D PrepareLinearTexture(Texture2D tex)
        {
            return ReimportTexture(tex, importer =>
            {
                importer.textureType = TextureImporterType.Default;
                importer.sRGBTexture = false;
            });
        }

        private static Texture2D PrepareNormalTexture(Texture2D tex)
        {
            return ReimportTexture(tex, importer =>
            {
                importer.textureType = TextureImporterType.NormalMap;
                importer.sRGBTexture = false;
            });
        }

        private static Texture2D ReimportTexture(Texture2D tex, Action<TextureImporter> configure)
        {
            if (tex == null) return null;

            string path = AssetDatabase.GetAssetPath(tex);
            TextureImporter importer = AssetImporter.GetAtPath(path) as TextureImporter;
            if (importer == null) return tex;

            configure(importer);
            importer.SaveAndReimport();

            return AssetDatabase.LoadAssetAtPath<Texture2D>(path);
        }

        private static Texture2D CreateInvertedRoughnessTexture(Texture2D roughness, string exportFolder, string outputName)
        {
            roughness = PrepareLinearTexture(roughness);
            Texture2D readable = CreateReadableCopy(roughness);

            try
            {
                Color[] pixels = readable.GetPixels();
                for (int i = 0; i < pixels.Length; i++)
                {
                    float v = 1f - pixels[i].r;
                    pixels[i] = new Color(v, v, v, 1f);
                }

                Texture2D smoothness = new Texture2D(readable.width, readable.height, TextureFormat.RGBA32, false, true);
                smoothness.SetPixels(pixels);
                smoothness.Apply();

                string safeName = SanitizeFileName(outputName);
                string outputPath = AssetDatabase.GenerateUniqueAssetPath($"{exportFolder}/{safeName}.png");
                File.WriteAllBytes(outputPath, smoothness.EncodeToPNG());
                UnityEngine.Object.DestroyImmediate(smoothness);

                AssetDatabase.ImportAsset(outputPath, ImportAssetOptions.ForceUpdate);
                Texture2D imported = AssetDatabase.LoadAssetAtPath<Texture2D>(outputPath);
                return PrepareLinearTexture(imported);
            }
            finally
            {
                UnityEngine.Object.DestroyImmediate(readable);
            }
        }

        private static Texture2D CreateReadableCopy(Texture2D source)
        {
            RenderTexture rt = RenderTexture.GetTemporary(
                source.width,
                source.height,
                0,
                RenderTextureFormat.ARGB32,
                RenderTextureReadWrite.Linear);

            Graphics.Blit(source, rt);

            RenderTexture prev = RenderTexture.active;
            RenderTexture.active = rt;

            Texture2D copy = new Texture2D(source.width, source.height, TextureFormat.RGBA32, false, true);
            copy.ReadPixels(new Rect(0, 0, source.width, source.height), 0, 0);
            copy.Apply();

            RenderTexture.active = prev;
            RenderTexture.ReleaseTemporary(rt);

            return copy;
        }

        private static Color ExtractSourceColor(Material srcMat)
        {
            if (srcMat == null) return Color.white;
            if (srcMat.HasProperty("_BaseColor")) return srcMat.GetColor("_BaseColor");
            if (srcMat.HasProperty("_Color")) return srcMat.GetColor("_Color");
            return Color.white;
        }

        private static void SetFloatSafe(Material mat, string property, float value)
        {
            if (mat != null && mat.HasProperty(property))
                mat.SetFloat(property, value);
        }

        private static void SetTextureSafe(Material mat, string property, Texture tex)
        {
            if (mat != null && mat.HasProperty(property))
                mat.SetTexture(property, tex);
        }

        private static void SetColorSafe(Material mat, string property, Color value)
        {
            if (mat != null && mat.HasProperty(property))
                mat.SetColor(property, value);
        }

        private static string CleanMaterialName(string name)
        {
            if (string.IsNullOrEmpty(name)) return "Material";
            return name.Replace(" (Instance)", "").Trim();
        }

        private static string SanitizeFileName(string name)
        {
            foreach (char c in Path.GetInvalidFileNameChars())
            {
                name = name.Replace(c, '_');
            }
            return name;
        }

        private static string Normalize(string value)
        {
            if (string.IsNullOrEmpty(value)) return string.Empty;

            StringBuilder sb = new StringBuilder(value.Length);
            foreach (char c in value.ToLowerInvariant())
            {
                if (char.IsLetterOrDigit(c))
                {
                    sb.Append(c);
                }
            }
            return sb.ToString();
        }

        private static void WriteHeader(StringBuilder sb, string title)
        {
            sb.AppendLine("============================================================");
            sb.AppendLine(title);
            sb.AppendLine("============================================================");
        }

        private void FinishReport(StringBuilder report, string exportPath, string runId)
        {
            Debug.Log(report.ToString());

            if (!writeReportToFile) return;

            try
            {
                string relativePath = $"{exportPath}/AutoMaterialReport_{runId}.txt";
                string absolutePath = Path.Combine(Directory.GetCurrentDirectory(), relativePath);
                File.WriteAllText(absolutePath, report.ToString(), Encoding.UTF8);
                AssetDatabase.Refresh();
                Debug.Log($"[自動マテリアル {ToolVersion}] report saved: {relativePath}");
            }
            catch (Exception ex)
            {
                Debug.LogWarning($"[自動マテリアル {ToolVersion}] report save failed: {ex.Message}");
            }
        }

        [Serializable]
        private class TextureCatalog
        {
            public List<TextureRecord> Records = new List<TextureRecord>();
        }

        [Serializable]
        private class TextureRecord
        {
            public Texture2D Texture;
            public string AssetPath;
            public string LowerName;
            public string NormalizedName;
        }

        private class RendererEntry
        {
            public int Index;
            public Renderer Renderer;
            public string RelativePathNoRoot;
            public string MeshName;
            public int MaterialSlotCount;
        }

        private class RendererCandidate
        {
            public RendererEntry Source;
            public int Score;
            public string Reason;
        }
    }
}
```