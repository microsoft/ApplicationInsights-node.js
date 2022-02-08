/**
 * Stack frame information.
 */
export class StackFrame {

    /**
     * Level in the call stack. For the long stacks SDK may not report every function in a call stack.
     */
    public level: number;

    /**
     * Method name.
     */
    public method: string;

    /**
     * Name of the assembly (dll, jar, etc.) containing this function.
     */
    public assembly: string;

    /**
     * File name or URL of the method implementation.
     */
    public fileName: string;

    /**
     * Line number of the code implementation.
     */
    public line: number;

    constructor() {
    }
}
