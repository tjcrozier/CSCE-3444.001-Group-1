const path = require("path");

module.exports = {
  target: "node",
  mode: "production",
  entry: "./extension.js",
  output: {
    path: path.resolve(__dirname, "dist"),
    filename: "extension.js",
    libraryTarget: "commonjs2",
  },
  externals: {
    vscode: "commonjs vscode", // Exclude VS Code API
  },
  resolve: {
    extensions: [".js"],
  },
  node: {
    __dirname: false,
    __filename: false,
  },
};
