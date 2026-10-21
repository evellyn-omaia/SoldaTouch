import assert from "node:assert/strict";
import { access, readdir, readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";

const raiz = path.resolve(fileURLToPath(new URL("..", import.meta.url)));

async function listarArquivos(diretorio) {
  const entradas = await readdir(diretorio, { withFileTypes: true });
  const arquivos = [];

  for (const entrada of entradas) {
    if ([".git", "node_modules", "__pycache__"].includes(entrada.name)) {
      continue;
    }

    const destino = path.join(diretorio, entrada.name);
    if (entrada.isDirectory()) {
      arquivos.push(...(await listarArquivos(destino)));
    } else {
      arquivos.push(destino);
    }
  }

  return arquivos;
}

function ehReferenciaLocal(referencia) {
  return (
    referencia &&
    !referencia.startsWith("#") &&
    !referencia.startsWith("data:") &&
    !referencia.startsWith("javascript:") &&
    !/^[a-z]+:/i.test(referencia) &&
    !referencia.includes("${")
  );
}

async function verificarReferencias(arquivo, referencias) {
  for (const referenciaOriginal of referencias) {
    const referencia = referenciaOriginal.split(/[?#]/, 1)[0];
    if (!ehReferenciaLocal(referencia) || referencia === "about:blank") {
      continue;
    }

    const destino = referencia.startsWith("/")
      ? path.join(raiz, referencia.slice(1))
      : fileURLToPath(new URL(referencia, pathToFileURL(arquivo)));

    await assert.doesNotReject(
      access(destino),
      `${path.relative(raiz, arquivo)} aponta para arquivo ausente: ${referenciaOriginal}`,
    );
  }
}

test("imports e recursos locais apontam para arquivos existentes", async () => {
  const arquivos = await listarArquivos(raiz);

  for (const arquivo of arquivos) {
    const extensao = path.extname(arquivo);
    if (![".html", ".css", ".js", ".mjs", ".cjs"].includes(extensao)) {
      continue;
    }

    const codigo = await readFile(arquivo, "utf8");
    const referencias = [];

    if (extensao === ".html") {
      referencias.push(
        ...[...codigo.matchAll(/\b(?:src|href)=["']([^"']+)["']/gi)].map(
          (resultado) => resultado[1],
        ),
      );
    }

    if ([".js", ".mjs", ".cjs"].includes(extensao)) {
      referencias.push(
        ...[...codigo.matchAll(/\b(?:from\s+|import\s*)["'](\.{1,2}\/[^"']+)["']/g)].map(
          (resultado) => resultado[1],
        ),
      );
    }

    if (extensao === ".css") {
      referencias.push(
        ...[...codigo.matchAll(/url\(\s*["']?([^"')]+)["']?\s*\)/gi)].map(
          (resultado) => resultado[1],
        ),
      );
    }

    await verificarReferencias(arquivo, referencias);
  }
});
