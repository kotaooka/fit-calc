# 開発者向け情報（fit-calc）

利用者向けの説明は [README.md](README.md) にあります。

## ファイル構成

```
index.html             画面（スタイルを含む）
js/fit.js              計算（ISO 286 の表と公差域、はめあい、ISO 965-1 の表とねじの寸法・はめあい、膜厚の効き）。Node でも読み込み可
js/app.js              画面処理（公差域の図、膜厚とすきまのグラフ、組み合わせ一覧、結果の表示、テーマ、入力の保存、Service Worker の登録）
sw.js                  オフライン用のキャッシュ処理（Service Worker）
manifest.webmanifest   アプリとして追加するための設定
og.png                 SNS 共有用の画像（tools/screenshots.py で作る）
icons/                 アプリアイコン（tools/make_icons.py で作る）
docs/screenshots/      README 用のスクリーンショット（tools/screenshots.py で撮る）
tests/test.js          検算テスト
.github/workflows/     push 時の自動テスト
```

## 更新して公開するとき

- `index.html`・`js/`・`icons/` を変更したら、**`sw.js` 先頭の `VERSION` を必ず上げてから** push してください。上げないと、すでに使っている人の端末に古いファイルが残り続けます
- 画面の見た目を変えたときは、`docs/screenshots/` の画像と `og.png` も撮り直してください（撮影手順は `tools/screenshots.py` の先頭）
- GitHub Pages は main ブランチのルートを公開しています

## テスト

```
node tests/test.js    # 不一致があれば終了コード 1
```

## 実装のメモ

- **単位**：寸法は mm、寸法許容差・すきま・膜厚は µm。すきまは直径で、正がすきま、負がしめしろ（干渉）
- **ISO 286 の区分**：細分 25 区分（`B`）で持ち、IT・d〜p などの主区分 13 区分の表は `fine()` で細分に広げる。境目の値は下の区分に入る（10 mm は 6〜10）
- **穴の寸法許容差**：C〜H は EI = −es。K・M・N は 8 級以下で ES = −ei + Δ（N は 9 級以上で 0、3 mm 以下は −4）。P〜U は 7 級以下で ES = −ei + Δ、8 級以上で −ei。J は表 `J_ES`
- **軸 j・k**：j は 5・6 級と 7 級で ei が違い、8 級は 3 mm 以下だけ。k の ei は IT4〜IT7 で正、それ以外は 0
- **ねじの表**：ISO 965-1 の表 1〜5 をそのまま持つ（式から計算して丸めると、M10 の TD2 などで表と合わないため）。有効径の公差は呼び径の区分（1.5〜355 mm の 8 区分）とピッチで引き、表にない組み合わせは誤りとして返す
- **膜厚の効き**：平行部 2t、ねじの有効径 4t、ねじの外径・内径 2t（`factor`）。最小すきまは両方の膜厚が最大、最大すきまは両方が最小の組み合わせ
- **入力の保存**：localStorage のキー `fit-calc-inputs`。読み書きはすべて try/catch で囲み、保存できない環境でも動きます
- **テーマ**：QC Workbench の全ツールで共通のキー `qc-workbench-theme`
