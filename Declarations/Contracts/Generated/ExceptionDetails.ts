import { StackFrame } from "./StackFrame";

/**
 * Exception details of the exception in a chain.
 */
export class ExceptionDetails {

    /**
     * In case exception is nested (outer exception contains inner one), the id and outerId properties are used to represent the nesting.
     */
    public id: number;

    /**
     * The value of outerId is a reference to an element in ExceptionDetails that represents the outer exception
     */
    public outerId: number;

    /**
     * Exception type name.
     */
    public typeName: string;

    /**
     * Exception message.
     */
    public message: string;

    /**
     * Indicates if full exception stack is provided in the exception. The stack may be trimmed, such as in the case of a StackOverflow exception.
     */
    public hasFullStack: boolean;

    /**
     * Text describing the stack. Either stack or parsedStack should have a value.
     */
    public stack: string;

    /**
     * List of stack frames. Either stack or parsedStack should have a value.
     */
    public parsedStack: StackFrame[];

    constructor() {
        this.hasFullStack = true;
        this.parsedStack = [];
    }
}
