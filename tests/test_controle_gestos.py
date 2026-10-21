import sys
import unittest
from pathlib import Path


PASTA_VISAO = Path(__file__).resolve().parents[1] / "Visao-computacional"
sys.path.insert(0, str(PASTA_VISAO))

from controle_gestos import ControleGestos  # noqa: E402


class RelogioFalso:
    def __init__(self):
        self.agora = 0.0

    def __call__(self):
        return self.agora

    def avancar(self, segundos):
        self.agora += segundos


class ControleGestosTest(unittest.TestCase):
    def setUp(self):
        self.relogio = RelogioFalso()
        self.publicados = []
        self.controle = ControleGestos(
            lambda gesto: self.publicados.append(gesto) or True,
            relogio=self.relogio,
            estabilidade=0.2,
        )

    def estabilizar(self, gesto, geracao=0):
        self.controle.atualizar(gesto, conectado=True, geracao=geracao)
        self.relogio.avancar(0.21)
        return self.controle.atualizar(gesto, conectado=True, geracao=geracao)

    def test_publica_cada_gesto_uma_vez_ate_voltar_ao_neutro(self):
        self.assertTrue(self.estabilizar("PALMA"))
        self.assertEqual(self.publicados, ["START"])

        self.relogio.avancar(1)
        self.assertFalse(self.controle.atualizar("PALMA", True))
        self.assertEqual(self.publicados, ["START"])

        self.assertFalse(self.estabilizar("NEUTRO"))
        self.assertTrue(self.estabilizar("PUNHO"))
        self.assertEqual(self.publicados, ["START", "PAUSA"])

    def test_reconexao_exige_gesto_neutro_antes_de_novo_comando(self):
        self.assertTrue(self.estabilizar("PALMA", geracao=1))
        self.assertFalse(self.estabilizar("PUNHO", geracao=2))
        self.assertEqual(self.publicados, ["START"])

        self.assertFalse(self.estabilizar("NEUTRO", geracao=2))
        self.assertTrue(self.estabilizar("PUNHO", geracao=2))
        self.assertEqual(self.publicados, ["START", "PAUSA"])


if __name__ == "__main__":
    unittest.main()
