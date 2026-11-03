export default function Cabecalho({ subtitulo }: { subtitulo?: string }) {
  return (
    <header className="cabecalho">
      <img src="/logo.png" alt="Restaurante & Churrascaria Don'Ana" />
      {subtitulo && <p>{subtitulo}</p>}
    </header>
  )
}
