export default function TermsPage() {
  return (
    <main className="max-w-2xl mx-auto px-4 py-16">
      <h1 className="font-display text-3xl font-bold mb-6">Termos de Participação</h1>
      <div className="space-y-4 text-ink-300 leading-relaxed">
        <p>
          Ao votar no Melhores do Ano, você concorda com os seguintes termos:
        </p>
        <ol className="list-decimal list-inside space-y-2">
          <li>Cada participante pode registrar apenas um voto por categoria, identificado pelo número de telefone informado.</li>
          <li>As informações fornecidas devem ser verdadeiras. Tentativas de fraude, uso de dados falsos ou votação automatizada podem resultar em invalidação do voto.</li>
          <li>A organização do evento se reserva o direito de revisar, invalidar ou bloquear votos identificados como suspeitos ou fraudulentos.</li>
          <li>Os dados pessoais dos participantes não serão exibidos publicamente.</li>
          <li>A organização pode alterar o período de votação, categorias e regras a qualquer momento, mediante aviso na própria página.</li>
        </ol>
      </div>
    </main>
  );
}
