// Toda categoria precisa de uma imagem visível — mas com centenas de
// categorias importadas em lote, não dá pra exigir que o admin cole uma URL
// em cada uma manualmente antes de abrir a votação. Enquanto o admin não
// define uma imagem própria (Category.imageUrl), geramos uma foto simbólica
// automática, sempre a mesma para a mesma categoria (determinística pelo
// slug), usando o Picsum Photos. Assim que o admin definir uma imagem real
// pela edição da categoria, ela substitui essa automática.
export function getCategoryImageUrl(category: { slug: string; imageUrl?: string | null }): string {
  if (category.imageUrl) return category.imageUrl;
  return `https://picsum.photos/seed/${encodeURIComponent(category.slug)}/800/450`;
}
