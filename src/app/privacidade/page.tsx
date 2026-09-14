export default function PrivacyPage() {
  return (
    <main className="max-w-2xl mx-auto px-4 py-16 prose-invert">
      <h1 className="font-display text-3xl font-bold mb-6">Política de Privacidade</h1>
      <div className="space-y-4 text-ink-300 leading-relaxed">
        <p>
          Esta Política de Privacidade descreve como o Melhores do Ano coleta, usa e protege os dados
          pessoais informados por participantes ao votar em nossas categorias, em conformidade com a
          Lei Geral de Proteção de Dados (LGPD — Lei nº 13.709/2018).
        </p>
        <h2 className="text-xl font-semibold text-ink-100 mt-8">Dados coletados</h2>
        <p>
          Coletamos nome, telefone/WhatsApp, e opcionalmente Instagram, e-mail, cidade e bairro, além de
          informações técnicas como endereço IP (armazenado apenas como hash), navegador utilizado e
          data/hora do voto, para fins de identificação do participante e prevenção de fraude.
        </p>
        <h2 className="text-xl font-semibold text-ink-100 mt-8">Uso dos dados</h2>
        <p>
          Os dados são usados exclusivamente para viabilizar a votação, evitar votos duplicados ou
          fraudulentos, e — caso você autorize expressamente — para contato sobre novidades do evento.
          Não vendemos nem compartilhamos seus dados com terceiros para fins comerciais.
        </p>
        <h2 className="text-xl font-semibold text-ink-100 mt-8">Seus direitos</h2>
        <p>
          Você pode solicitar a qualquer momento a exclusão, correção ou exportação dos seus dados
          pessoais entrando em contato com a organização do evento.
        </p>
        <h2 className="text-xl font-semibold text-ink-100 mt-8">Segurança</h2>
        <p>
          Adotamos medidas técnicas de segurança, incluindo hash de senhas administrativas, hash de
          endereços IP, controle de acesso ao painel administrativo e proteção contra acessos indevidos.
        </p>
      </div>
    </main>
  );
}
