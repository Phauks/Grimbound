/**
 * TypeScript declarations for html2pdf.js
 *
 * html2pdf.js doesn't have official @types, so we declare the module here.
 */

declare module 'html2pdf.js' {
    interface Html2PdfImageOptions {
        type?: 'jpeg' | 'png' | 'webp'
        quality?: number
    }

    interface Html2CanvasOptions {
        scale?: number
        useCORS?: boolean
        allowTaint?: boolean
        backgroundColor?: string | null
        logging?: boolean
        onclone?: (doc: Document, element: HTMLElement) => void
    }

    interface JsPDFOptions {
        unit?: 'pt' | 'mm' | 'cm' | 'in'
        format?: string | [number, number]
        orientation?: 'portrait' | 'landscape'
        compress?: boolean
    }

    interface PagebreakOptions {
        mode?: string | string[]
        before?: string | string[]
        after?: string | string[]
        avoid?: string | string[]
    }

    interface Html2PdfOptions {
        margin?: number | [number, number, number, number]
        filename?: string
        image?: Html2PdfImageOptions
        html2canvas?: Html2CanvasOptions
        jsPDF?: JsPDFOptions
        pagebreak?: PagebreakOptions
        enableLinks?: boolean
    }

    interface Html2PdfWorker {
        set(options: Html2PdfOptions): Html2PdfWorker
        from(element: HTMLElement | string): Html2PdfWorker
        save(): Promise<void>
        toPdf(): Html2PdfWorker
        get(type: 'pdf'): Promise<any>
        outputPdf(type?: 'blob' | 'datauristring' | 'arraybuffer'): Promise<Blob | string | ArrayBuffer>
        output(type: 'blob'): Promise<Blob>
        output(type: 'datauristring'): Promise<string>
        output(type: 'arraybuffer'): Promise<ArrayBuffer>
    }

    function html2pdf(): Html2PdfWorker
    function html2pdf(element: HTMLElement, options?: Html2PdfOptions): Html2PdfWorker

    export = html2pdf
}
