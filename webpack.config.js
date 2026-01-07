import { dirname } from "path";
import { fileURLToPath } from "url";
import { BundleAnalyzerPlugin } from "webpack-bundle-analyzer";

const __dirname = dirname(fileURLToPath(import.meta.url));

export default {
  entry: "./main.js",
  output: {
    filename: "ImageMemo.js",
    path: __dirname + "/dist",
    libraryExport: "default", // Export only the 'default' export directly
  },
};
