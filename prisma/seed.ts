import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "@prisma/client";
import path from "path";

const dbPath = `file:${path.join(process.cwd(), "prisma", "dev.db")}`;
const adapter = new PrismaBetterSqlite3({ url: dbPath });
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const prisma = new PrismaClient({ adapter } as any);

async function main() {
  // Sample project
  const project = await prisma.project.upsert({
    where: { id: "sample-project-1" },
    update: {},
    create: {
      id: "sample-project-1",
      title: "健康・美容チャンネル",
      description: "ダイエット・筋トレ・美容に関するショート動画シリーズ",
      genre: "健康・美容",
      targetAudience: "20〜35歳の働く女性",
    },
  });

  // Sample script
  const script = await prisma.script.upsert({
    where: { id: "sample-script-1" },
    update: {},
    create: {
      id: "sample-script-1",
      projectId: project.id,
      title: "【3分で分かる】脂肪燃焼を加速させる朝の習慣",
      topic: "朝の脂肪燃焼習慣",
      hook: "「朝起きてすぐこれをやるだけで脂肪燃焼率が2倍になります。今日から始められる簡単な3つの習慣、今すぐチェック！」",
      body: "多くの人が朝食を食べてすぐ運動していますが、実はこれは逆効果。今回は脂肪を効率的に燃やすための正しい朝の順番をお伝えします。\n\n1つ目：起きてすぐ白湯を飲む。睡眠中に失った水分を補給し、代謝を高めます。\n\n2つ目：朝食前に15分のウォーキング。空腹時に動くことで、脂肪が優先的にエネルギー源として使われます。\n\n3つ目：高タンパクの朝食。卵や鶏むね肉で筋肉をキープしながら脂肪だけを落とします。",
      callToAction: "この習慣、今日から試してみてください！効果を感じたらいいねとフォローをお願いします。コメントで報告待ってます！",
      hashtags: "#ダイエット #朝活 #脂肪燃焼 #健康習慣 #筋トレ女子 #ダイエット方法 #朝の習慣",
      duration: 60,
      status: "approved",
      aiModel: "claude-opus-4-7",
      scenes: {
        create: [
          { order: 1, text: "「朝起きてすぐこれをやるだけで脂肪燃焼率が2倍になります」", visualNote: "Woman waking up energetically, morning sunlight, healthy lifestyle, photorealistic", duration: 5 },
          { order: 2, text: "「今日から始められる簡単な3つの習慣を紹介します」", visualNote: "Clean white background with text overlay showing '3 steps', minimalist design", duration: 5 },
          { order: 3, text: "「習慣1：起きてすぐ白湯を飲む。代謝が上がります」", visualNote: "Glass of warm water with steam, morning kitchen setting, warm lighting", duration: 12 },
          { order: 4, text: "「習慣2：朝食前に15分のウォーキング。空腹時に脂肪が燃えます」", visualNote: "Woman walking in morning park, sunrise background, athletic wear, healthy", duration: 15 },
          { order: 5, text: "「習慣3：高タンパクの朝食。卵や鶏むね肉で筋肉を守る」", visualNote: "Healthy breakfast plate with eggs and chicken, bright food photography", duration: 13 },
          { order: 6, text: "「この3つを続けるだけで、1ヶ月で変化を実感できます」", visualNote: "Before and after transformation concept, motivational, clean design", duration: 7 },
          { order: 7, text: "「いいね・フォローで次の動画もお届けします！」", visualNote: "Animated like and follow button graphic, vibrant colors, social media style", duration: 3 },
        ],
      },
    },
  });

  // Sample image assets
  await prisma.imageAsset.upsert({
    where: { id: "sample-image-1" },
    update: {},
    create: {
      id: "sample-image-1",
      scriptId: script.id,
      title: "シーン1 - 朝の目覚め",
      prompt: "Woman waking up energetically, morning sunlight streaming through window, healthy lifestyle, photorealistic, 4K, 9:16 vertical",
      negativePrompt: "blurry, low quality, distorted, dark",
      service: "dall-e-3",
      status: "pending",
      aspectRatio: "9:16",
      style: "realistic",
    },
  });

  await prisma.imageAsset.upsert({
    where: { id: "sample-image-2" },
    update: {},
    create: {
      id: "sample-image-2",
      scriptId: script.id,
      title: "シーン4 - 朝のウォーキング",
      prompt: "Athletic young woman walking in morning park, sunrise background, pink athletic wear, healthy and energetic, cinematic, 9:16 vertical",
      negativePrompt: "blurry, unrealistic, dark",
      service: "stable-diffusion",
      status: "completed",
      imageUrl: "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400&h=711&fit=crop",
      aspectRatio: "9:16",
      style: "realistic",
    },
  });

  // Sample video asset
  await prisma.videoAsset.upsert({
    where: { id: "sample-video-1" },
    update: {},
    create: {
      id: "sample-video-1",
      scriptId: script.id,
      title: "脂肪燃焼朝習慣 - TikTok版",
      service: "d-id",
      status: "pending",
      duration: 60,
      aspectRatio: "9:16",
      notes: "フック部分はインパクト重視で。BGMは明るいポップ系。",
    },
  });

  // Sample tasks
  const taskData = [
    { id: "task-1", title: "台本「朝の脂肪燃焼習慣」の最終確認", status: "in_progress", priority: "high", category: "script", projectId: project.id },
    { id: "task-2", title: "シーン1〜3の画像をDALL-Eで生成", status: "todo", priority: "high", category: "image", projectId: project.id },
    { id: "task-3", title: "D-IDでリップシンク動画を作成", status: "todo", priority: "medium", category: "video", projectId: project.id },
    { id: "task-4", title: "TikTokのハッシュタグトレンド調査", status: "done", priority: "medium", category: "research", projectId: project.id },
    { id: "task-5", title: "今月の投稿カレンダーを作成", status: "todo", priority: "urgent", category: "post", projectId: project.id },
  ];

  for (const task of taskData) {
    await prisma.scheduleTask.upsert({
      where: { id: task.id },
      update: {},
      create: task,
    });
  }

  // Sample post schedule
  const nextWeek = new Date();
  nextWeek.setDate(nextWeek.getDate() + 7);
  nextWeek.setHours(19, 0, 0, 0);

  await prisma.postSchedule.upsert({
    where: { id: "sample-post-1" },
    update: {},
    create: {
      id: "sample-post-1",
      projectId: project.id,
      platform: "tiktok",
      title: "脂肪燃焼朝習慣 TikTok投稿",
      caption: "知らないと損！朝これをやるだけで脂肪燃焼が2倍に🔥 今日から始めよう💪",
      hashtags: "#ダイエット #朝活 #脂肪燃焼 #健康習慣 #fyp #foryou",
      scheduledAt: nextWeek,
      status: "scheduled",
    },
  });

  console.log("✅ Seed data created successfully");
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
