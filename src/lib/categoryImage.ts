import { guessCategoryEmoji } from './categoryEmoji';

// Toda categoria precisa de uma imagem visível — mas com centenas de
// categorias importadas em lote, não dá pra exigir que o admin cole uma URL
// relevante em cada uma manualmente antes de abrir a votação. Enquanto o
// admin não define uma imagem própria (Category.imageUrl), geramos um
// cartão simbólico: gradiente + o emoji relacionado ao tema da categoria
// (não uma foto aleatória sem relação nenhuma com o assunto). Assim que o
// admin definir uma imagem real pela edição da categoria, ela substitui essa
// automática.

// Algumas cores de gradiente (tons compatíveis com o visual dourado/escuro
// do site), escolhidas de forma determinística pelo slug para variar entre
// categorias sem depender de aleatoriedade.
const GRADIENTS: [string, string][] = [
  ['#3a2a12', '#0f1219'],
  ['#1f2a1a', '#0f1219'],
  ['#1a2430', '#0f1219'],
  ['#2a1a2e', '#0f1219'],
  ['#2e1a1a', '#0f1219'],
  ['#1a2a28', '#0f1219'],
];

function hashSlug(slug: string): number {
  let hash = 0;
  for (let i = 0; i < slug.length; i++) {
    hash = (hash * 31 + slug.charCodeAt(i)) >>> 0;
  }
  return hash;
}

function buildSymbolicImage(category: { slug: string; name: string; emoji?: string }): string {
  const emoji =
    category.emoji && category.emoji !== '🏆' ? category.emoji : guessCategoryEmoji(category.name);
  const [c1, c2] = GRADIENTS[hashSlug(category.slug) % GRADIENTS.length];

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="450" viewBox="0 0 800 450">
    <defs>
      <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="${c1}"/>
        <stop offset="100%" stop-color="${c2}"/>
      </linearGradient>
    </defs>
    <rect width="800" height="450" fill="url(#g)"/>
    <text x="400" y="255" font-size="180" text-anchor="middle" dominant-baseline="middle">${emoji}</text>
  </svg>`;

  // Codificação por percent-encoding (não base64) para funcionar tanto no
  // servidor quanto no navegador sem depender de Buffer/btoa — btoa quebra
  // com caracteres fora do Latin1, o que inclui todo emoji.
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

export function getCategoryImageUrl(category: { slug: string; name: string; imageUrl?: string | null; emoji?: string }): string {
  if (category.imageUrl) return category.imageUrl;
  return buildSymbolicImage(category);
}
