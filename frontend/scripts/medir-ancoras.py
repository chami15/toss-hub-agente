#!/usr/bin/env python3
"""
Mede a âncora de cada sprite do pack e gera src/features/escritorio/ancoras.ts.

Âncora = o ponto do PNG que deve cair na coordenada do tabuleiro, ou
seja o CENTRO DO LOSANGO DA BASE da peça (o "pé" dela). Expressa em
fração da imagem (0..1), que é o formato que o `anchor` do Pixi usa.

Como acha: os pixels opacos mais baixos são a ponta de baixo do
losango da base. O losango tem a proporção do tile (208x146), então a
partir da largura dá pra saber sua altura, e subir metade dela chega
no centro. Em fórmula:

    base_y = (última linha opaca) − (largura × TILE_H / TILE_W) / 2

Validado contra as 15 âncoras que tinham sido calibradas a olho: bate
com erro de 0.0 a 0.1 pixel. O detalhe que fazia diferença é que o
getbbox() do Pillow devolve o limite de baixo EXCLUSIVO — daí o −1.

Por que por DIREÇÃO e não por peça: o mesmo móvel tem alturas
diferentes em cada rotação (chairDesk tem 78px em NE e 97px em SE).
Uma âncora só pra peça faz o móvel pular do chão ao girar.

Uso:  python3 scripts/medir-ancoras.py
Precisa de Pillow (pip install pillow). Só roda quando o pack mudar.
"""

from pathlib import Path
from PIL import Image

RAIZ = Path(__file__).resolve().parent.parent
SPRITES = RAIZ / "public" / "Isometric"
SAIDA = RAIZ / "src" / "features" / "escritorio" / "ancoras.ts"

TILE_W, TILE_H = 208, 146
DIRECOES = ("NE", "NW", "SE", "SW")

# Casos onde a medição automática não vale. Os tiles de piso trazem a
# própria espessura desenhada abaixo do losango, então a última linha
# opaca não é a ponta da base — é a quina de baixo da laje do tile.
OVERRIDES = {
    "floorFull": (0.5, 0.477),
}


def medir(caminho: Path) -> tuple[float, float] | None:
    with Image.open(caminho) as im:
        im = im.convert("RGBA")
        caixa = im.getbbox()
        if not caixa:
            return None
        x0, y0, x1, y1 = caixa
        largura = x1 - x0
        # −1 porque y1 vem exclusivo: a última linha opaca é y1−1
        base_y = (y1 - 1) - (largura * TILE_H / TILE_W) / 2
        return ((x0 + x1) / 2 / im.width, base_y / im.height)


def main() -> None:
    linhas: list[str] = []
    medidas = 0
    faltando: list[str] = []

    pecas = sorted({p.name.rsplit("_", 1)[0] for p in SPRITES.glob("*.png")})
    for peca in pecas:
        for direcao in DIRECOES:
            caminho = SPRITES / f"{peca}_{direcao}.png"
            if not caminho.exists():
                faltando.append(caminho.name)
                continue
            if peca in OVERRIDES:
                x, y = OVERRIDES[peca]
            else:
                medido = medir(caminho)
                if medido is None:
                    faltando.append(caminho.name)
                    continue
                x, y = medido
            linhas.append(f"  {peca}_{direcao}: {{ x: {x:.3f}, y: {y:.3f} }},")
            medidas += 1

    SAIDA.write_text(
        "// GERADO por scripts/medir-ancoras.py — não editar na mão.\n"
        "// Rode o script de novo se o pack de sprites mudar.\n"
        "//\n"
        "// Âncora = o ponto do PNG que cai na coordenada do tabuleiro (o\n"
        "// centro do losango da base da peça). É por DIREÇÃO porque o mesmo\n"
        "// móvel tem alturas diferentes em cada rotação — uma âncora só pra\n"
        "// peça faria o móvel pular do chão ao girar.\n"
        "\n"
        "export interface Ancora {\n  x: number\n  y: number\n}\n\n"
        "export const ANCORAS: Record<string, Ancora> = {\n"
        + "\n".join(linhas)
        + "\n}\n\n"
        "export const ANCORA_PADRAO: Ancora = { x: 0.5, y: 0.7 }\n\n"
        "export function ancoraDe(peca: string, direcao: string): Ancora {\n"
        "  return ANCORAS[`${peca}_${direcao}`] ?? ANCORA_PADRAO\n"
        "}\n",
        encoding="utf-8",
    )

    print(f"{medidas} âncoras -> {SAIDA.relative_to(RAIZ)}")
    if faltando:
        print(f"sem sprite ({len(faltando)}): {', '.join(faltando[:8])}")


if __name__ == "__main__":
    main()
