import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { jsPDFDocument } from 'jspdf-autotable';


import { pdfData } from './mockData';

// To bring into TWL /////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

// Types
export type AutoTableWidthSetting = 'half' | 'full';

// constants
const colorPalette = {
  treppBlue: '#2C5CAA', // Used for Table Title Text
  treppWhite: '#FFFFFF', // Used for row bg 1
  treppLightGrey: '#EEEEEE', // Used for row bg 2
  treppGrey: '#C5C5C5', // used for subheaders
  treppBlack: '#333333' // use for text
};

const defaultOptions = {
  margin: 19,
  marginBuffer: 19 * 2,
}


//functions

const addSharedStyles = (doc: any, styles: any) => ({
  ...styles,
  styles: {
    font: 'helvetica',
    cellPadding: {
      vertical: 0.3,
      horizontal: 1
    },
    valign: 'bottom'
  },
  bodyStyles: {
    fontSize: 7,
  },
  headStyles: {
    fontSize: 7,
    fillColor: colorPalette.treppGrey,
    textColor: colorPalette.treppBlack
  },
})

const smallTableStyles = (doc: any) => ({
  tableWidth: (doc.getPageWidth() / 2) - 19,
  columnStyles: {
    1: {
      halign: 'right',
    }
  }
});

const largeTableStyles = (doc: any, head: any, defaultOptions: any) => ({
  // styles: {
  //   minCellWidth: (doc.getPageWidth() - (defaultOptions.margin * 2)) / head[head.length - 1].length
  // }
})


export const pdfBuilder = (doc: any) => {
  return {
    addTitleToHead(head: any, title: any) {
      const dataCols: [] = head[head.length - 1];
      const hasNoHeaders = dataCols.every(val => !val);
      const titleHeader = [{
        content: title,
        colSpan: dataCols.length,
        styles: {
          fillColor: colorPalette.treppLightGrey,
          textColor: colorPalette.treppBlue,
          fontSize: 10,
        }
      }]
      return hasNoHeaders ? [titleHeader] : [titleHeader, ...head];
    }
  }
}
// End to bring into TWL /////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////






// Helpers just for playground ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
const smallTableGenericHead: any = [[undefined, undefined]];
const headGenerator = (colCount: any) => {
  const head: any = [];
  Array.from({ length: colCount }, (_, i) => i).forEach((_, idx) => {
    head.push(`Col ${idx + 1}`)
  });
  return [head];
}
const bodyGenerator = (rowCount: any, headLen: any) => {
  const body: any = [];
  Array.from({ length: rowCount }, (_, i) => i).forEach((_, r) => {
    body.push(Array.from({ length: headLen }, (_, i) => (r * 10) + i + 1))
  });
  return body;
}
const smallTableBodyGenerator: any = (rowCount: number) => {
  const body: any = []
  Array.from({ length: rowCount }, (_, i) => i).forEach(_ => {
    body.push([Math.floor(Math.random() * 100), Math.floor(Math.random() * 100)])
  })
  return body;
}
const tables: any = [
  {
    head: headGenerator(10),
    body: bodyGenerator(10, 10),
    widthSetting: 'full' as AutoTableWidthSetting,
  }
]
// End Helpers for playground /////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////



function generatePdf() {
  const doc: jsPDF | any = new jsPDF('l', 'pt');
  console.log('doc.getPageWidth()', doc.getPageWidth())
  console.log('doc.getPageHeight()', doc.getPageHeight())
  doc.html(document.getElementById('pdf-output'), {
    margin: 0,
    windowWidth: doc.getPageWidth(),
    width: doc.getPageWidth() / 2,
    callback() {
      (document as any).getElementById("output").data = doc.output('datauristring');
    }
  });

















  // console.log('doc', doc)
  // const { margin, marginBuffer } = defaultOptions;
  // // let cursorYPos = margin;
  // // let cursorXPos = margin;
  // // tables.forEach((table: any) => {
  // //   console.log('table', table);
  // //   const { head, body, widthSetting = 'full' } = table;
  // //   // Add title to head
  // //   // doc.autoTable({
  // //   //   margin: margin,
  // //   //   head: head,
  // //   //   body: body,
  // //   //   startY: cursorYPos * 1.2,
  // //   //   ...styles
  // //   // });
  // // });

  // // TODO: Logic to add each small table to fit into two columns 
  // Object.values(pdfData).forEach(tab => {
  //   Object.values(tab).forEach(segment => {
  //     Object.values(segment).forEach(table => {
  //       const { head, body, title, tableWidth }: any = table;
  //       const builder = pdfBuilder(doc);
  //       const pdfHead = builder.addTitleToHead(head, title);
  //       let currTableStyle = tableWidth === 200 ? 'sm' : 'lg'

  //       const styles = currTableStyle === 'sm' ? smallTableStyles(doc) : largeTableStyles(doc, head, defaultOptions);
  //       doc.autoTable({
  //         margin,
  //         horizonatalPageBreak: 'avoid',
  //         head: pdfHead,
  //         body,
  //         ...addSharedStyles(doc, styles),
  //         didParseCell: (cellHook: any) => {
  //           // console.log(`didParseCell`)
  //           // console.log('cellHook', cellHook);
  //           // Use this cell hook for formatting unique cells
  //           // debugger;
  //         },
  //         willDrawCell: (cellHook: any) => {
  //           // console.log(`willDrawCell`)
  //           // console.log('cellHook', cellHook);
  //           if (currTableStyle === 'sm' && cellHook.section === head) {

  //           }
  //           // debugger;
  //         },
  //         didDrawCell: (cellHook: any) => {
  //           // console.log(`didDrawCell`)
  //           // console.log('cellHook', cellHook)
  //           // debugger;
  //         },
  //         didDrawPage: (pageHook: any) => {
  //           // console.log(`didDrawPage`);
  //           // console.log('pageHook', pageHook)
  //           // debugger;
  //         },
  //       })
  //     })
  //   })
  // });

}



generatePdf();



