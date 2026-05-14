# SNS動画マネジメントシステム

生成AIを活用したショート動画制作・SNSマネタイズ管理システムです。

## 機能一覧

### コア機能
| 機能 | 説明 |
|------|------|
| **台本・スクリプト管理** | Claude AIによる台本自動生成、シーン分割、ハッシュタグ生成 |
| **画像生成管理** | DALL-E / Stable Diffusion等のプロンプト管理と生成ステータス追跡 |
| **動画生成管理** | D-ID / HeyGen / Runway等のリップシンク・AI動画ジョブ管理 |
| **カンバンボード** | タスクの進捗管理（未着手→進行中→レビュー→完了） |
| **投稿スケジュール** | TikTok・YouTube Shorts・Instagram Reels・Xの投稿予約管理 |
| **アナリティクス** | 再生数・いいね・コメント・収益の記録と分析 |
| **プロジェクト管理** | チャンネル・シリーズ単位でのコンテンツ管理 |
| **設定** | APIキー管理（Anthropic・OpenAI・D-ID・HeyGen等） |

## セットアップ

### 1. 依存パッケージのインストール
```bash
npm install
```

### 2. データベースのセットアップ
```bash
npm run db:migrate
npm run db:seed  # サンプルデータを投入する場合
```

### 3. 環境変数の設定
`.env.local` を作成してAPIキーを設定（または設定ページから入力）：
```env
ANTHROPIC_API_KEY=sk-ant-...   # Claude AI 台本生成
```

### 4. 開発サーバー起動
```bash
npm run dev
```

[http://localhost:3000](http://localhost:3000) でアクセスできます。

## 使い方

1. **設定ページ** でプロジェクトを作成し、APIキーを登録
2. **台本・スクリプト** ページで「AI生成」ボタンからトピックを入力して台本を自動生成
3. 生成された台本の各シーンに対して **画像生成管理** でプロンプトを管理
4. DALL-E等で生成した画像を使って **動画生成管理** でD-ID等のリップシンク動画を管理
5. **スケジュール** でカンバンボードとタスク管理、投稿予約
6. 投稿後は **アナリティクス** でパフォーマンスを記録・分析

## 推奨連携サービス

| 用途 | サービス |
|------|---------|
| 台本生成 | Claude API (Anthropic) |
| 画像生成 | DALL-E 3 / Stable Diffusion / Midjourney |
| リップシンク動画 | D-ID / HeyGen |
| AI動画生成 | Runway ML / Pika Labs / Kling AI |
| 投稿 | TikTok / YouTube Shorts / Instagram Reels / X |

## 技術スタック

- **フロントエンド**: Next.js 16 (App Router) + TypeScript + Tailwind CSS
- **データベース**: SQLite (Prisma ORM)
- **AI**: Anthropic Claude API
- **UI**: カスタムコンポーネント + Lucide Icons

## コマンド一覧

```bash
npm run dev          # 開発サーバー起動
npm run build        # プロダクションビルド
npm run db:migrate   # DBマイグレーション実行
npm run db:seed      # サンプルデータ投入
npm run db:studio    # Prisma Studio (DBブラウザ)
```
