import path from "path";

export default {
  entry: "./index.js",
  output: {
    path: path.resolve(import.meta.dirname, "dist"),
    filename: "ImageMemo.js",
    globalObject: "this",
    library: {
      name: "ImageMemo",
      type: "umd",
    },
  },
};
