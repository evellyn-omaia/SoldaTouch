export function criarServicoProgramas({
  banco,
  criarReferencia,
  escrever,
  ler,
  excluir,
  esperarUsuario,
  obterEmpresa,
  agora = () => new Date(),
}) {
  const caminhoProgramas = (empresaId, nome = "") =>
    `empresas/${empresaId}/programas${nome ? `/${nome}` : ""}`;

  const normalizarNome = (nome) => nome.trim().replace(/[.#$/[\]]/g, "-");

  return Object.freeze({
    async salvar(nome, programa) {
      const usuario = await esperarUsuario();
      const empresaId = obterEmpresa();
      const nomeSeguro = normalizarNome(nome);

      await escrever(
        criarReferencia(banco, caminhoProgramas(empresaId, nomeSeguro)),
        {
          ...programa,
          nome,
          chave: nomeSeguro,
          uidUsuario: usuario.uid,
          emailUsuario: usuario.email,
          empresaId,
          data: agora().toLocaleString("pt-BR"),
        },
      );

      return nomeSeguro;
    },

    async carregar(nome) {
      await esperarUsuario();
      const empresaId = obterEmpresa();
      const snapshot = await ler(
        criarReferencia(banco, caminhoProgramas(empresaId, nome)),
      );

      return snapshot.exists() ? snapshot.val() : null;
    },

    async listar() {
      await esperarUsuario();
      const empresaId = obterEmpresa();
      const snapshot = await ler(
        criarReferencia(banco, caminhoProgramas(empresaId)),
      );

      return snapshot.exists() ? snapshot.val() : {};
    },

    async excluir(nome) {
      await esperarUsuario();
      const empresaId = obterEmpresa();

      await excluir(
        criarReferencia(banco, caminhoProgramas(empresaId, nome)),
      );
    },
  });
}
