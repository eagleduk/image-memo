import HtmlWebpackPlugin from "html-webpack-plugin";
import path from "path";

export default {
  entry: "./index.js",
  output: {
    path: path.resolve(path.dirname("."), "dist"), // 깃허브 페이지 배포 시 `docs`로 변경
    filename: "app.bundle.js",
    clean: true,
  },
  module: {
    rules: [
      {
        test: /\.css$/, // 파일명이 .css로 끝나는 모든 파일에 적용
        // 배열 마지막 요소부터 오른쪽에서 왼쪽 순으로 적용
        // 순서 주의 : 먼저 css-loader가 적용되고, styled-loader가 적용되어야 한다.
        use: ["style-loader", "css-loader"],
        // loader가 node_modules 안의 있는 내용도 처리하기 때문에
        // node_modules는 제외해야 한다.
        exclude: /node_modules/,
      },
    ],
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: path.resolve(path.dirname("."), ".", "index.html"),
    }),
  ],
};
