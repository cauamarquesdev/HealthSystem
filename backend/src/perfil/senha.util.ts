/**
 * Verificação e geração de hash de senha.
 *
 * Detecta sozinho a biblioteca pelo formato do hash guardado no banco:
 *   - "$2a$/$2b$/$2y$"  → bcryptjs ou bcrypt
 *   - "$argon2…"        → argon2
 *
 * Se o seu login usa outra coisa, ajuste APENAS este arquivo.
 * (O import dinâmico evita erro de compilação quando alguma biblioteca não está instalada.)
 */

type Bcrypt = { compare(s: string, h: string): Promise<boolean>; hash(s: string, rounds: number): Promise<string> };
type Argon = { verify(h: string, s: string): Promise<boolean>; hash(s: string): Promise<string> };

async function carregar<T>(nome: string): Promise<T | null> {
  try {
    const mod = (await import(nome)) as { default?: T } & T;
    return (mod.default ?? mod) as T;
  } catch {
    return null;
  }
}

const eBcrypt = (h: string) => /^\$2[aby]\$/.test(h);
const eArgon = (h: string) => h.startsWith('$argon2');

async function bcrypt() {
  return (await carregar<Bcrypt>('bcryptjs')) ?? (await carregar<Bcrypt>('bcrypt'));
}

export async function verificarSenha(hash: string, senha: string): Promise<boolean> {
  if (eArgon(hash)) {
    const a = await carregar<Argon>('argon2');
    if (!a) throw new Error('Biblioteca "argon2" não encontrada.');
    return a.verify(hash, senha);
  }
  if (eBcrypt(hash)) {
    const b = await bcrypt();
    if (!b) throw new Error('Biblioteca "bcryptjs" ou "bcrypt" não encontrada.');
    return b.compare(senha, hash);
  }
  throw new Error('Formato de hash não reconhecido. Ajuste src/perfil/senha.util.ts para a biblioteca do seu login.');
}

/** Gera o novo hash usando o mesmo algoritmo do hash atual (mantém compatibilidade com o login). */
export async function gerarHash(senha: string, hashAtual: string): Promise<string> {
  if (eArgon(hashAtual)) {
    const a = await carregar<Argon>('argon2');
    if (!a) throw new Error('Biblioteca "argon2" não encontrada.');
    return a.hash(senha);
  }
  const b = await bcrypt();
  if (!b) throw new Error('Biblioteca "bcryptjs" ou "bcrypt" não encontrada.');
  return b.hash(senha, 10);
}