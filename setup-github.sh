#!/bin/bash

# GitHubリポジトリのURLを設定
# あなたのGitHubユーザー名に置き換えてください
GITHUB_USERNAME="your-github-username"

echo "GitHubリポジトリをリモートに追加します..."
git remote add origin https://github.com/${GITHUB_USERNAME}/beeartena-next.git

echo "現在のリモート設定を確認..."
git remote -v

echo "mainブランチに切り替え..."
git branch -M main

echo "GitHubにプッシュ..."
git push -u origin main

echo "完了！GitHubリポジトリにコードがアップロードされました。"