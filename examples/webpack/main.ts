import jsPDF from 'jspdf';
import 'jspdf-autotable';

//Helpers just for playground
const smallTableGenericHead: any = [[undefined, undefined]];
const smallTableBodyGenerator: any = (rowCount: number) => {
  const body: any = []
  Array.from({ length: rowCount }, (_, i) => i).forEach(_ => {
    body.push([Math.random() * 100, Math.random() * 100])
  })
  return body;
}


// End Helpers for playground



function generatePdf() {
  var head = smallTableGenericHead
  var body = smallTableBodyGenerator(10)
  var doc: any = new jsPDF();
  doc.autoTable({ head: head, body: body });
  (document as any).getElementById("output").data = doc.output('datauristring');
}

generatePdf();
