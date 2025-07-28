export default function SkipLink() {
  return (
    <a
      href="#main-content"
      className="absolute left-0 top-0 z-[100] bg-primary text-white px-4 py-2 transform -translate-y-full focus:translate-y-0 transition-transform duration-200"
    >
      メインコンテンツへスキップ
    </a>
  )
}
