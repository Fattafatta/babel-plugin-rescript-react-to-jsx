import chai, { expect } from "chai";
import convertTo from "./chai-convert-to";

chai.use(
  convertTo(
    "convertTo",
    { plugins: [require.resolve("../"), "@babel/syntax-object-rest-spread"] },
    { plugins: ["@babel/syntax-jsx", "@babel/syntax-object-rest-spread"] }
  )
);

describe("JsxRuntime.jsx-to-JSX", () => {
	it("should support all ReScript function calls", () => {
    expect('JsxRuntime.jsx("h1")').to.convertTo("<h1 />;");
		expect('JsxRuntime.jsxs("h1")').to.convertTo("<h1 />;");
    expect('JsxRuntime.jsxDEV("h1")').to.convertTo("<h1 />;");
  });
  it("should convert 1-argument calls", () => {
    expect('JsxRuntime.jsx("h1")').to.convertTo("<h1 />;");
    expect("JsxRuntime.jsx(Foo)").to.convertTo("<Foo />;");
    expect("JsxRuntime.jsx(Foo.Bar)").to.convertTo("<Foo.Bar />;");
    expect("JsxRuntime.jsx(Foo.Bar.Baz)").to.convertTo("<Foo.Bar.Baz />;");
  });

  it("should handle props without children", () => {
    expect('JsxRuntime.jsx("h1", {hi: there})').to.convertTo(
      "<h1 hi={there} />;"
    );
    expect('JsxRuntime.jsx("h2", {"hi": there})').to.convertTo(
      "<h2 hi={there} />;"
    );
    expect('JsxRuntime.jsx("h3", {hi: "there"})').to.convertTo(
      '<h3 hi="there" />;'
    );
  });

  it("should handle spread props", () => {
    expect('JsxRuntime.jsx("h1", props)').to.convertTo(
      "<h1 {...props} />;"
    );
    expect('JsxRuntime.jsx("h1", getProps())').to.convertTo(
      "<h1 {...getProps()} />;"
    );
  });

  it("should handle mixed props", () => {
    expect(
      'JsxRuntime.jsx("h1", _extends({ hi: "there" }, props))'
    ).to.convertTo('<h1 hi="there" {...props} />;');
    expect(
      'JsxRuntime.jsx("h1", _extends({}, props, { hi: "there" }))'
    ).to.convertTo('<h1 {...props} hi="there" />;');
    expect('JsxRuntime.jsx("h1", { ...props, hi: "there" })').to.convertTo(
      '<h1 {...props} hi="there" />;'
    );
  });

  it("should handle props and children", () => {
    expect('JsxRuntime.jsx("h1", {hi: there, children: "Header"})').to.convertTo(
      "<h1 hi={there}>Header</h1>;"
    );
  });

  it("should handle props and multiple children", () => {
    expect('JsxRuntime.jsx("h1", {hi: there, children: ["Header", " Footer"]})').to.convertTo(
      "<h1 hi={there}>Header Footer</h1>;"
    );
    expect('JsxRuntime.jsx("h1", {hi: there, children: ["Header", JsxRuntime.jsx("div", {children: "Child"})]})').to.convertTo(
      "<h1 hi={there}>Header<div>Child</div></h1>;"
    );
  });

  it("should handle children in nested expressions", () => {
    expect(
      'JsxRuntime.jsx("h1", {children: foo ? JsxRuntime.jsx("p") : null})'
    ).to.convertTo("<h1>{foo ? <p /> : null}</h1>;");
  });

  it("should handle react fragments", () => {
    expect("React.createElement(React.Fragment, null)").to.convertTo("<></>;");
    expect("React.createElement(ReasonReact.fragment, null)").to.convertTo("<></>;");
    expect("React.createElement(JsxRuntime.Fragment, null)").to.convertTo("<></>;");
    expect("React.createElement(JsxRuntime.jsxFragment, null)").to.convertTo("<></>;");
  });
});
