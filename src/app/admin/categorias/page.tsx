'use client';

import { useEffect, useState } from 'react';

interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  emoji: string;
  active: boolean;
  order: number;
  _count: { companies: number; votes: number };
}

// Taxonomia real de categorias usada em concursos "Melhores do Ano" municipais
// (referência: melhoresdoano.vercel.app, edições Barretos-SP e Bebedouro-SP
// 2024, ~316 categorias únicas após limpeza/deduplicação). Serve como ponto
// de partida editável — nada aqui é criado automaticamente, o admin revisa e
// importa só o que quiser pelo botão abaixo.
const CATEGORY_SUGGESTIONS = [
  'Academia', 'Academia de Crosstraining', 'Academia de Luta', 'Açaiteria', 'Acessórios Automotivos',
  'Acessórios para Celulares', 'Açougue', 'Acupunturista', 'Adega', 'Adestrador (a) de Cães',
  'Administradora de Condomínios', 'Advogado (a)', 'Afiador (a) de Alicate de Cutícula', 'Agência Bancária',
  'Agência de Crédito', 'Agência de Marketing', 'Agência de Publicidade', 'Agência de Viagens',
  'Agropecuária', 'Algodão Doce', 'Alimentos Artesanais', 'Aluguel de Brinquedos',
  'Animadores de Festas e Eventos', 'Ar Condicionado', 'Arquiteto (a)', 'Artesão (ã)', 'Artigos para Festas',
  'Artigos Religiosos', 'Assessoria em TI', 'Assessoria Esportiva', 'Assessoria Imobiliária',
  'Assistência Técnica em Celulares', 'Ateliê de Noivas', 'Atendente', 'Atleta', 'Auto Center',
  'Auto Elétrica', 'Auto Escola', 'Auto Peças', 'Aviamentos (Armarinho)', 'Azulejista', 'Babá', 'Banda',
  'Banho e Tosa', 'Bar / Pub', 'Barbearia Infantil', 'Barbeiro (a)', 'Bartender', 'Bicicletaria',
  'Bijuterias e Acessórios', 'Body e Piercing', 'Bolos Caseiros', 'Bombeiro (a)', 'Borracharia', 'Brechó',
  'Bronzeamento Artificial', 'Bronzeamento Natural', 'Buffet', 'Buffet de Festa Infantil',
  'Cabeleireiro (a)', 'Cabeleireiro (a) Especialista em Cabelos Cacheados',
  'Cabeleireiro (a) Especialista em Cabelos Loiros', 'Cabeleireiro (a) Especialista em Mega Hair',
  'Cabeleleiro (a) Especialista em Noivas', 'Cafeteria', 'Calhas e Rufos', 'Cantor (a)',
  'Carrinho de Pipoca', 'Cartório', 'Casa de Assados', 'Casa de Shows', 'Celebrante de Casamento',
  'Centro de Massagens', 'Cerimonialista', 'Cerveja Artesanal', 'Chapeiro (a)', 'Chaveiro (a)',
  'Chefe de Cozinha', 'Choperia', 'Churrasqueiro', 'Churros', 'Cirurgião (ã) Plástico',
  'Clínica de Depilação a Laser', 'Clínica de Estética', 'Clínica de Fisioterapia',
  'Clínica de Intervenção Precoce', 'Clínica de Podologia', 'Clínica de Radiologia',
  'Clínica Especializada em Emagrecimento', 'Clínica Especializada em Harmonização Facial', 'Clínica Médica',
  'Clínica Odontológica', 'Clínica Oftalmológica', 'Clínica Veterinária', 'Clube de Tiro', 'Coach Pessoal',
  'Comida Japonesa', 'Condutor (a) Escolar', 'Confeiteiro (a)', 'Confeiteiro (a) de Bolos Festivos',
  'Construção Civil', 'Construtora', 'Consultor (a) Agrícola', 'Consultoria de RH',
  'Consultório Psicológico', 'Contador (a)', 'Conveniência', 'Corretor (a) de Seguros',
  'Cortinas e Persianas', 'Costureiro (a)', 'Dançarino (a)', 'Decoração Pegue e Monte',
  'Decorador (a) de Festas e Eventos', 'Dentista', 'Depilador (a)', 'Dermatologista',
  'Designer de Interiores', 'Designer de Joias', 'Designer de Sobrancelhas', 'Designer Gráfico',
  'Despachante', 'Diarista', 'Disk Entulho', 'Distribuidora de Água', 'Distribuidora de Bebidas',
  'Distribuidora de Gás', 'DJ', 'Doces para Festas e Eventos', 'Doces Personalizados',
  'Drinks para Festas e Eventos', 'Editor (a) de Vídeo', 'Eletricista', 'Emissora de Rádio', 'Energia Solar',
  'Enfermeiro (a)', 'Engenheiro (a)', 'Equipamentos para Construção', 'Escola Berçario', 'Escola de Artes',
  'Escola de Dança', 'Escola de Educação Infantil', 'Escola de Inglês', 'Escola de Música',
  'Escola Particular', 'Escolinha de Futebol', 'Escritório de Advocacia', 'Escritório de Contabilidade',
  'Escritório de Coworking', 'Esfiharia', 'Espaço de Lazer', 'Espaço para Festas', 'Espetinho',
  'Estética Automotiva', 'Esteticista', 'Estúdio de Alongamento de Cílios', 'Estúdio de Depilação',
  'Estúdio de Gravação', 'Estúdio Fotográfico', 'Faculdade', 'Farmacêutico (a)', 'Farmácia',
  'Farmácia de Manipulação', 'Fisioterapeuta', 'Floricultura', 'Fonoaudiólogo (a)', 'Fotógrafo (a)',
  'Fretes de Mudanças', 'Funerária', 'Funilaria e Pintura', 'Garçom / Garçonete', 'Gesseiro', 'Gráfica',
  'Guia de Turismo', 'Hamburgueria', 'Higienização de Estofados', 'Hortifruti', 'Hot Dog', 'Hotel',
  'Imobiliária', 'Influencer Infantil', 'Influenciador (a) Digital', 'Instrutor (a) de Pilates',
  'Jardinagem e Paisagismo', 'Jardineiro', 'Joalheria', 'Laboratório de Análises Clínicas',
  'Laboratório Veterinário', 'Laceira', 'Lanchonete', 'Lash Designer', 'Lava Car', 'Lavanderia',
  'Limpeza e Faxina', 'Locutor (a)', 'Loja Cestas de Café da Manhã',
  'Loja de Aluguel de Roupas para Eventos', 'Loja de Artigos de Pesca', 'Loja de Bolsas e Acessórios',
  'Loja de Brinquedos', 'Loja de Calçados', 'Loja de Cama, Mesa e Banho', 'Loja de Canecas Personalizadas',
  'Loja de Celulares', 'Loja de Cosméticos', 'Loja de Ferramentas', 'Loja de Lingeries', 'Loja de Maquiagem',
  'Loja de Motos', 'Loja de Móveis', 'Loja de Piscinas', 'Loja de Preço Único', 'Loja de Presentes',
  'Loja de Rações', 'Loja de Roupas Femininas', 'Loja de Roupas Fitness', 'Loja de Roupas Infantis',
  'Loja de Roupas Masculinas', 'Loja de Roupas Plus Size', 'Loja de Tecidos', 'Loja Moda de Praia',
  'Lotérica', 'Manicure e Pedicure', 'Maquiador (a)', 'Marcenaria', 'Marmitaria', 'Martelinho de Ouro',
  'Massagista', 'Massoterapeuta', 'Material de Construção', 'Mecânico (a) de Carros',
  'Mecânico (a) de Motos', 'Médico (a)', 'Médico (a) Pediatra', 'Médico (a) Veterinário', 'Mercado',
  'Micropigmentadora', 'Modelo', 'Montador (a) de Móveis', 'Moto Peças', 'Motoboy',
  'Motorista de Aplicativo', 'Móveis Planejados', 'Nail Designer Especialista em Alongamento Acrílico',
  'Nails Designer Especialista em Alongamento em Fibra', 'Nails Designer Especialista em Alongamento em Gel',
  'Nutricionista', 'Oficina de Moto', 'Oficina Mecânica', 'Ótica', 'Página de Instagram/Facebook (Notícias)',
  'Panificadora', 'Pão de Mel', 'Papelaria', 'Papelaria Personalizada', 'Pastelaria', 'Pedreiro',
  'Perfumaria', 'Personal Trainer', 'Pesqueiro (Pesque e Pague)', 'Pet Shop', 'Petiscaria', 'Pintor (a)',
  'Pintor (a) Automotivo', 'Pintura Facial', 'Pizzaria', 'Podcast', 'Podólogo (a)', 'Portal de Notícias',
  'Posto de Combustível', 'Produtor (a) de Vídeos', 'Produtor (a) Musical', 'Produtos de Limpeza',
  'Produtos Naturais', 'Professor (a)', 'Professor (a) de Beach Tennis', 'Professor (a) de Natação',
  'Profissional de Harmonização Facial', 'Promotor (a) de Festas e Eventos', 'Psicólogo (a)',
  'Psicopedagogo (a)', 'Recreador (a)', 'Restaurante', 'Restaurante Delivery', 'Revenda de Veículos',
  'Salão de Beleza', 'Salgados', 'Segurança', 'Segurança de Eventos', 'Seguro Veicular', 'Semijoias',
  'Sensei de Judô', 'Serralheria', 'Sexy Shop', 'Sindicato', 'Som para Eventos', 'Sorveteria',
  'Studio de Makeup', 'Studio de Micropigmentação', 'Supermercado', 'Suplementos', 'Sushiman',
  'Tatuador (a)', 'Tosador (a)', 'Trancista', 'Transportadora', 'Transporte Escolar', 'Treinador (a)',
  'Troca de Óleo', 'Universidade em EAD', 'Vendedor (a)', 'Vendedor (a) de Veículos', 'Vereador (a)',
  'Videomaker', 'Vidraçaria', 'Vidraceiro (a)', 'Vistoria Veicular',
];

export default function AdminCategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ name: '', description: '', emoji: '🏆' });
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [showBulkImport, setShowBulkImport] = useState(false);
  const [bulkText, setBulkText] = useState(CATEGORY_SUGGESTIONS.join('\n'));
  const [bulkSaving, setBulkSaving] = useState(false);
  const [bulkResult, setBulkResult] = useState<string | null>(null);

  function load() {
    fetch('/api/admin/categories')
      .then((r) => r.json())
      .then((d) => {
        setCategories(d.categories);
        setLoading(false);
      });
  }

  useEffect(load, []);

  async function createCategory(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const res = await fetch('/api/admin/categories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) {
      setError(data.error);
      return;
    }
    setForm({ name: '', description: '', emoji: '🏆' });
    load();
  }

  async function toggleActive(cat: Category) {
    await fetch(`/api/admin/categories/${cat.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ active: !cat.active }),
    });
    load();
  }

  async function remove(cat: Category) {
    if (!confirm(`Excluir/desativar a categoria "${cat.name}"?`)) return;
    await fetch(`/api/admin/categories/${cat.id}`, { method: 'DELETE' });
    load();
  }

  async function importBulk() {
    const names = bulkText
      .split('\n')
      .map((n) => n.trim())
      .filter(Boolean);
    if (names.length === 0) return;

    setBulkSaving(true);
    setBulkResult(null);
    const res = await fetch('/api/admin/categories/bulk', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ names }),
    });
    const data = await res.json();
    setBulkSaving(false);
    if (!res.ok) {
      setBulkResult(data.error ?? 'Erro ao importar.');
      return;
    }
    setBulkResult(`${data.created} categoria(s) criada(s), ${data.skipped} já existiam e foram ignoradas.`);
    load();
  }

  return (
    <div className="space-y-8 max-w-3xl">
      <h1 className="font-display text-2xl font-bold">Categorias</h1>

      <form onSubmit={createCategory} className="bg-ink-800/60 border border-ink-700 rounded-2xl p-5 space-y-4">
        <h2 className="font-semibold">Nova categoria</h2>
        <div className="flex gap-3">
          <input
            className="input w-20 text-center text-xl"
            value={form.emoji}
            onChange={(e) => setForm((f) => ({ ...f, emoji: e.target.value }))}
            maxLength={4}
          />
          <input
            className="input flex-1"
            placeholder="Nome da categoria (ex: Melhor Ótica)"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            required
          />
        </div>
        <input
          className="input"
          placeholder="Descrição (opcional)"
          value={form.description}
          onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
        />
        {error && <p className="text-red-400 text-sm">{error}</p>}
        <button type="submit" disabled={saving} className="btn-primary disabled:opacity-60">
          {saving ? 'Salvando...' : 'Adicionar categoria'}
        </button>
      </form>

      <div className="bg-ink-800/60 border border-ink-700 rounded-2xl p-5 space-y-4">
        <button
          type="button"
          onClick={() => setShowBulkImport((s) => !s)}
          className="text-sm text-gold-400 hover:underline"
        >
          {showBulkImport ? 'Ocultar' : 'Importar várias categorias de uma vez'}
        </button>

        {showBulkImport && (
          <div className="space-y-3">
            <p className="text-ink-400 text-xs">
              Uma categoria por linha. Já vem preenchido com uma lista de referência de categorias reais usadas em
              concursos "Melhores do Ano" — edite à vontade antes de importar (remova o que não usar, adicione o
              que faltar). Categorias com o mesmo nome de uma já existente são ignoradas.
            </p>
            <textarea
              className="input min-h-[200px] font-mono text-xs"
              value={bulkText}
              onChange={(e) => setBulkText(e.target.value)}
            />
            {bulkResult && <p className="text-sm text-ink-300">{bulkResult}</p>}
            <button
              type="button"
              onClick={importBulk}
              disabled={bulkSaving}
              className="btn-secondary disabled:opacity-60"
            >
              {bulkSaving ? 'Importando...' : 'Importar lista'}
            </button>
          </div>
        )}
      </div>

      <div className="space-y-3">
        {loading && <p className="text-ink-400">Carregando...</p>}
        {categories.map((cat) => (
          <div
            key={cat.id}
            className="bg-ink-800/60 border border-ink-700 rounded-xl p-4 flex items-center justify-between gap-4"
          >
            <div className="flex items-center gap-3 min-w-0">
              <span className="text-2xl">{cat.emoji}</span>
              <div className="min-w-0">
                <p className="font-medium truncate">{cat.name}</p>
                <p className="text-xs text-ink-500">
                  {cat._count.companies} empresas · {cat._count.votes} votos
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => toggleActive(cat)}
                className={`text-xs px-2.5 py-1 rounded-full border ${
                  cat.active
                    ? 'border-green-500/40 text-green-400'
                    : 'border-ink-600 text-ink-400'
                }`}
              >
                {cat.active ? 'Ativa' : 'Inativa'}
              </button>
              <button onClick={() => remove(cat)} className="text-xs text-red-400 hover:underline">
                Excluir
              </button>
            </div>
          </div>
        ))}
        {!loading && categories.length === 0 && (
          <p className="text-ink-500 text-sm">Nenhuma categoria cadastrada ainda.</p>
        )}
      </div>
    </div>
  );
}
