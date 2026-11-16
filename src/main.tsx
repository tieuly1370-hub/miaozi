import { render } from "preact";
import { App } from "./app";
import { registerSW } from "./update";
import "./styles.css";

render(<App />, document.getElementById("app")!);
registerSW();
