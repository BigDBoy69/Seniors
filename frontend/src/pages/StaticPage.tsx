export function StaticPage({ title }: { title: string }) {
  return (
    <div className="min-h-screen pt-24">
      <div className="max-w-6xl mx-auto px-6 py-16">
        <h1 className="font-serif text-5xl mb-4">{title}</h1>
      </div>
    </div>
  )
}
