declare module "udomdiff/esm" {
  function udomdiff(
    parent: Node,
    currentChildren: Node[],
    futureChildren: Node[],
    nodeCallback: (node: Node, operation: number) => void,
    insertBeforeNode?: Node | null
  ): Node[];

  export default udomdiff;
}
