// Parsing e classificação de votos por comentário do Instagram.
//
// Formato aceito por linha (um comentário por linha):
//   usuario: texto do comentário
//   @usuario texto do comentário
//
// O admin cola isso manualmente (copiado do Instagram, ou de uma exportação),
// já que não temos integração automática via Instagram Graph API.

export interface ParsedComment {
  username: string;
  text: string;
}

export type InstagramVoteStatus = 'VALID' | 'MULTIPLE_VOTE' | 'MULTIPLE_MENTION' | 'NO_MENTION' | 'EXTRA_TEXT';

export interface ClassifiedComment extends ParsedComment {
  status: InstagramVoteStatus;
  companyId: string | null;
}

const MENTION_RE = /@([a-zA-Z0-9._]{2,60})/g;
const EXTRA_TEXT_THRESHOLD = 40; // caracteres de texto além da menção para marcar como "texto além do voto"

export function parseCommentsBlock(raw: string): ParsedComment[] {
  return raw
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map(parseLine)
    .filter((c): c is ParsedComment => c !== null);
}

function parseLine(line: string): ParsedComment | null {
  const colonMatch = line.match(/^@?([a-zA-Z0-9._]{2,60})\s*:\s*(.*)$/);
  if (colonMatch) {
    return { username: colonMatch[1].toLowerCase(), text: colonMatch[2] };
  }

  const mentionFirstMatch = line.match(/^@([a-zA-Z0-9._]{2,60})\s+(.*)$/);
  if (mentionFirstMatch) {
    return { username: mentionFirstMatch[1].toLowerCase(), text: mentionFirstMatch[2] };
  }

  return null;
}

/**
 * Classifica uma lista de comentários já parseados contra o mapa de handles
 * (@instagram normalizado sem @, minúsculo) -> companyId das empresas da categoria.
 * A ordem da lista importa: a primeira menção válida de cada usuário conta,
 * as seguintes são marcadas como MULTIPLE_VOTE.
 */
export function classifyComments(
  comments: ParsedComment[],
  handleToCompanyId: Map<string, string>,
): ClassifiedComment[] {
  const votedUsers = new Set<string>();
  const results: ClassifiedComment[] = [];

  for (const comment of comments) {
    const mentions = Array.from(comment.text.matchAll(MENTION_RE)).map((m) => m[1].toLowerCase());
    const matchedCompanyIds = Array.from(
      new Set(mentions.map((handle) => handleToCompanyId.get(handle)).filter((id): id is string => !!id)),
    );

    if (matchedCompanyIds.length === 0) {
      results.push({ ...comment, status: 'NO_MENTION', companyId: null });
      continue;
    }

    if (matchedCompanyIds.length > 1) {
      results.push({ ...comment, status: 'MULTIPLE_MENTION', companyId: null });
      continue;
    }

    if (votedUsers.has(comment.username)) {
      results.push({ ...comment, status: 'MULTIPLE_VOTE', companyId: null });
      continue;
    }

    votedUsers.add(comment.username);

    const textWithoutMention = comment.text.replace(MENTION_RE, '').trim();
    const status: InstagramVoteStatus = textWithoutMention.length > EXTRA_TEXT_THRESHOLD ? 'EXTRA_TEXT' : 'VALID';

    results.push({ ...comment, status, companyId: matchedCompanyIds[0] });
  }

  return results;
}
