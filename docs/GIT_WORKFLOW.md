# Git運用メモ（混乱しないための手順）

## 基本フロー
1. `git switch main && git pull --rebase`
2. `git switch -c feat/<短い説明>`
3. 変更 → `git status` / `git diff`
4. `git add -p`（基本は部分追加）→ `git commit -m "feat(...): ..."`
5. `git push -u origin feat/<短い説明>`
6. GitHubでPR作成 → CI/Preview確認 → Merge

## 角カッコを含むパス（Next.jsの動的ルート）に注意
zsh では `[]` がグロブ扱いになり、次のようなエラーになります:
- `zsh: no matches found: app/api/.../[userId]/route.ts`

対策（どれか一つでOK）:
- `git add -- 'app/api/admin/line/conversations/[userId]/route.ts'`
- `git add -- app/api/admin/line/conversations/\\[userId\\]/route.ts`
- `noglob git add app/api/admin/line/conversations/[userId]/route.ts`

## mainへ直接pushしない（原則）
- 例外: 小さな緊急修正（ビルド落ちなど）で、PRを切る時間がない場合のみ
- 基本はPR→Mergeで反映（履歴とレビューを残す）

## ローカルを綺麗に保つ
- 取り込み: `git pull --rebase`
- リモート追従を更新: `git fetch -p`
- マージ済みブランチ削除: `git branch --merged | rg -v \"\\*|main\" | xargs -n 1 git branch -d`

