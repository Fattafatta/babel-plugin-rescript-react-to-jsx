import chai, { expect } from "chai";
import convertTo from "./chai-convert-to";

chai.use(
  convertTo(
    "convertToV3",
    { plugins: [[require.resolve("../"), { jsx: "v3" }],"@babel/syntax-object-rest-spread"] },
    { plugins: ["@babel/syntax-jsx", "@babel/syntax-object-rest-spread"] }
  )
);

describe("createElement-to-JSX", () => {
  it("should support all ReScript function calls", () => {
    expect('React.createElement("h1")').to.convertToV3("<h1 />;");
    expect('ReactDOMRe.createElement("h1")').to.convertToV3("<h1 />;");
    expect('ReactDOMRe.createDOMElementVariadic("h1")').to.convertToV3("<h1 />;");
    expect('React.createElementVariadic("h1")').to.convertToV3("<h1 />;");
  });
  it("should convert 1-argument calls", () => {
    expect('React.createElement("h1")').to.convertToV3("<h1 />;");
    expect('ReactDOMRe.createDOMElementVariadic("h1")').to.convertToV3("<h1 />;");
    expect("React.createElement(Foo)").to.convertToV3("<Foo />;");
    expect("React.createElement(Foo.Bar)").to.convertToV3("<Foo.Bar />;");
    expect("React.createElement(Foo.Bar.Baz)").to.convertToV3("<Foo.Bar.Baz />;");
  });

  it("should convert effective 1-argument calls (with null or undefined)", () => {
    expect('React.createElement("h1", null)').to.convertToV3("<h1 />;");
    expect('React.createElement("h2", null, null)').to.convertToV3("<h2 />;");
    expect('React.createElement("h3", undefined)').to.convertToV3("<h3 />;");
  });

  it("should handle props without children", () => {
    expect('React.createElement("h1", {hi: there})').to.convertToV3(
      "<h1 hi={there} />;"
    );
    expect('React.createElement("h2", {"hi": there})').to.convertToV3(
      "<h2 hi={there} />;"
    );
    expect('React.createElement("h3", {hi: "there"})').to.convertToV3(
      '<h3 hi="there" />;'
    );
  });

  it("should handle spread props", () => {
    expect('React.createElement("h1", props)').to.convertToV3(
      "<h1 {...props} />;"
    );
    expect('React.createElement("h1", getProps())').to.convertToV3(
      "<h1 {...getProps()} />;"
    );
  });

  it("should handle mixed props", () => {
    expect(
      'React.createElement("h1", _extends({ hi: "there" }, props))'
    ).to.convertToV3('<h1 hi="there" {...props} />;');
    expect(
      'React.createElement("h1", _extends({}, props, { hi: "there" }))'
    ).to.convertToV3('<h1 {...props} hi="there" />;');
    expect('React.createElement("h1", { ...props, hi: "there" })').to.convertToV3(
      '<h1 {...props} hi="there" />;'
    );
  });

  it("should handle props and ignore “null”/“undefined” children", () => {
    expect(
      'React.createElement("h1", {hi: there}, null, undefined)'
    ).to.convertToV3("<h1 hi={there} />;");
  });

  it("should ignore “null”/“undefined” props and handle children", () => {
    expect('React.createElement("h1", null, "Header")').to.convertToV3(
      "<h1>Header</h1>;"
    );
    //this can be created from e.g. '<h2>Header{"harhar"}</h2>', but i think there’s no downside to merging it
    expect('React.createElement("h2", null, "Header", "harhar")').to.convertToV3(
      "<h2>Headerharhar</h2>;"
    );
    expect(
      'React.createElement("h3", null, React.createElement("i"))'
    ).to.convertToV3("<h3><i /></h3>;");
    expect(
      'React.createElement("h4", null, "a", React.createElement("b"), "c")'
    ).to.convertToV3("<h4>a<b />c</h4>;");
  });

  it("should handle props and children", () => {
    //we extensively tested props and children separately, so only sth. basic
    expect('React.createElement("h1", {hi: there}, "Header")').to.convertToV3(
      "<h1 hi={there}>Header</h1>;"
    );
  });

  it("should ignore intermingled “null”/“undefined” children", () => {
    expect(
      'React.createElement("h1", null, null, "Header", undefined)'
    ).to.convertToV3("<h1>Header</h1>;");
  });

  it("should handle children in nested expressions", () => {
    expect(
      'React.createElement("h1", null, foo ? React.createElement("p") : null)'
    ).to.convertToV3("<h1>{foo ? <p /> : null}</h1>;");
  });
});
