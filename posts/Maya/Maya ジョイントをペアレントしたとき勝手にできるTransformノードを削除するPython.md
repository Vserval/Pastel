
![[スクリーンショット 2026-03-17 165514.avif]]

## 説明

このスクリプトは、Maya の joint 親子構造の中に誤って挿入された中間 transform を自動検出し、  
skinCluster のウェイトを退避したうえで階層を修復し、最後に skin を再構築してウェイトを復元します。  
対象は主に次のような壊れ方です。

```text
parentJoint
    insertedTransform
        childJoint
```

## アルゴリズム

```mermaid
flowchart LR
    A[検出] --> B[ウェイト退避]
    B --> C[unbind]
    C --> D[bindPose削除]
    D --> E[Freeze Transform]
    E --> F[中間transform削除]
    F --> G[re-parent]
    G --> H[再bind]
    H --> I[ウェイト復元]
```

> [!IMPORTANT]  
> skin 情報を保持したまま骨階層だけを安全に修復するのが目的です。


![[自動削除.py]]

