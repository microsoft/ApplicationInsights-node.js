import { AzureFunctionsLoader } from "../azureFunctionsLoader";

const loader = new AzureFunctionsLoader();
loader.initialize();
export = loader;
