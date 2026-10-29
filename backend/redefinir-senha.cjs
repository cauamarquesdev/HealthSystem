
const { PrismaClient } = require("@prisma/client");
const { randomBytes, scrypt: scryptCallback } = require("crypto");
const { promisify } = require("util");
const scrypt = promisify(scryptCallback);

const prisma = new PrismaClient();

async function hashPassword(password) {
  const salt = randomBytes(16);
  const hash = await scrypt(password, salt, 64);

  return `${salt.toString("base64")}:${Buffer.from(hash).toString("base64")}`;
}

async function main() {
  const email = process.argv[2];
  const password = process.env.NOVA_SENHA;

  if (!email || !password) {
    throw new Error(
      'Uso: $env:NOVA_SENHA="SuaNovaSenha"; node .\\redefinir-senha.cjs seu@email.com'
    );
  }

  const user = await prisma.user.findFirst({
    where: { email },
    select: { id: true, email: true },
  });

  if (!user) {
    throw new Error("Nenhum usuário encontrado com esse e-mail.");
  }

  const hashedPassword = await hashPassword(password);

  await prisma.user.update({
    where: { id: user.id },
    data: { password: hashedPassword },
  });

  console.log(`Senha redefinida com sucesso para: ${user.email}`);
}

main()
  .catch((error) => {
    console.error("Erro:", error.message);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
