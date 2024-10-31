import React, { useState, useEffect } from 'react';
import { PDFDownloadLink, Document, Page, Text, View, StyleSheet, Font, pdf } from '@react-pdf/renderer';
import * as docx from 'docx';
import { saveAs } from 'file-saver';
import { Clipboard, FileText } from 'lucide-react';


// Font registration for PDF
Font.register({
  family: 'Inter',
  src: 'https://rsms.me/inter/font-files/Inter-Regular.woff2'
});

const styles = StyleSheet.create({
  page: {
    padding: 30,
    fontFamily: 'Inter'
  },
  text: {
    fontSize: 12,
    lineHeight: 1.5
  }
});

const MarkdownFormatter = () => {
  const [inputText, setInputText] = useState('');
  const [outputText, setOutputText] = useState('');
  const [activeTab, setActiveTab] = useState('edit');
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);

  const sampleText = `# Welcome to Markdown Formatter

## Features
* **Bold** and *italic* text formatting
* Lists (ordered and unordered)
* Code blocks with syntax highlighting
* > Blockquotes for emphasis
* Links like [this one](https://example.com)

### Code Example
\`\`\`javascript
const greeting = "Hello World!";
console.log(greeting);
\`\`\`

1. First ordered item
2. Second ordered item
3. Third ordered item

---
Feel free to try it out!`;

  const processMarkdown = (text) => {
    const codeBlocks = [];
    let processedText = text.replace(/```([\s\S]*?)```/g, (match) => {
      codeBlocks.push(match);
      return `__CODE_BLOCK_${codeBlocks.length - 1}__`;
    });

    // Enhanced header processing with anchor links
    processedText = processedText.replace(/^#{1,6}\s(.*$)/gm, (match, content) => {
      const hLevel = match.trim().split(' ')[0].length;
      const anchor = content.toLowerCase().replace(/[^\w\s]/g, '').replace(/\s+/g, '-');
      const sizeMap = {
        1: '48px',
        2: '36px',
        3: '30px',
        4: '24px',
        5: '20px',
        6: '16px'
      };

      return `
        <h${hLevel} id="${anchor}" class="group relative mt-8 mb-4">
          <span style="font-size: ${sizeMap[hLevel]}; font-weight: bold; color: #1F2937;">
            ${content}
          </span>
          <a href="#${anchor}" class="invisible group-hover:visible absolute -left-5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
            #
          </a>
        </h${hLevel}>
      `;
    });

    // Enhanced formatting
    processedText = processedText
      .replace(/\*\*\*(.*?)\*\*\*/g, '<strong><em>$1</em></strong>')
      .replace(/\*\*(.*?)\*\*|__(.*?)__/g, '<strong class="font-semibold">$1$2</strong>')
      .replace(/\*(.*?)\*|_(.*?)_/g, '<em class="italic">$1$2</em>')
      .replace(/^>\s*(.*$)/gm, '<blockquote class="pl-4 border-l-4 border-blue-500 bg-blue-50 p-4 rounded-r my-4 italic text-gray-700">$1</blockquote>')
      .replace(/`([^`]+)`/g, '<code class="bg-gray-100 px-1.5 py-0.5 rounded text-sm font-mono text-pink-500">$1</code>')
      .replace(/^---+$/gm, '<hr class="my-8 border-t-2 border-gray-200">')
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="text-blue-600 hover:text-blue-800 hover:underline" target="_blank" rel="noopener noreferrer">$1</a>');

    // Process lists with enhanced styling
    const processLists = (text) => {
      const lines = text.split('\n');
      let result = [];
      let inUnorderedList = false;
      let inOrderedList = false;
      let listLevel = 0;

      lines.forEach((line) => {
        const unorderedMatch = line.match(/^(\s*)([-*+])\s(.+)/);
        const orderedMatch = line.match(/^(\s*)(\d+)\.\s(.+)/);

        if (unorderedMatch) {
          const indent = unorderedMatch[1].length / 2;
          if (!inUnorderedList || indent !== listLevel) {
            if (inUnorderedList) result.push('</ul>');
            inUnorderedList = true;
            listLevel = indent;
            result.push(`<ul class="list-disc ml-${4 + indent * 4} space-y-2 my-4">`);
          }
          result.push(`<li class="text-gray-700">${unorderedMatch[3]}</li>`);
        } else if (orderedMatch) {
          const indent = orderedMatch[1].length / 2;
          if (!inOrderedList || indent !== listLevel) {
            if (inOrderedList) result.push('</ol>');
            inOrderedList = true;
            listLevel = indent;
            result.push(`<ol class="list-decimal ml-${4 + indent * 4} space-y-2 my-4">`);
          }
          result.push(`<li class="text-gray-700">${orderedMatch[3]}</li>`);
        } else {
          if (inUnorderedList) {
            inUnorderedList = false;
            result.push('</ul>');
          }
          if (inOrderedList) {
            inOrderedList = false;
            result.push('</ol>');
          }
          if (line.trim()) {
            result.push(`<p class="my-4 leading-relaxed text-gray-700">${line}</p>`);
          }
        }
      });

      if (inUnorderedList) result.push('</ul>');
      if (inOrderedList) result.push('</ol>');
      
      return result.join('\n');
    };

    processedText = processLists(processedText);

    // Process code blocks with syntax highlighting
    processedText = processedText.replace(/__CODE_BLOCK_(\d+)__/g, (match, index) => {
      const code = codeBlocks[parseInt(index)]
        .replace(/```(\w+)?\n([\s\S]*?)```/g, (_, lang, content) => content.trim());
      
      return `
        <pre class="relative group">
          <div class="absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <button onclick="navigator.clipboard.writeText(this.parentElement.parentElement.querySelector('code').textContent)" class="bg-gray-700 hover:bg-gray-600 text-white rounded px-2 py-1 text-sm">
              Copy
            </button>
          </div>
          <code class="block bg-gray-900 text-gray-100 p-4 rounded-lg my-4 font-mono text-sm overflow-x-auto">
            ${code}
          </code>
        </pre>
      `;
    });

    return processedText;
  };

  const formatText = () => {
    setLoading(true);
    setTimeout(() => {
      setOutputText(processMarkdown(inputText));
      setLoading(false);
      setActiveTab('preview');
    }, 100);
  };

  const copyToClipboard = async () => {
    try {
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = outputText;
      const textToCopy = tempDiv.textContent || tempDiv.innerText;
      await navigator.clipboard.writeText(textToCopy);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy text:', err);
    }
  };

  // Inside the MarkdownFormatter component, add these functions
  const generateDocxDocument = () => {
    const processMarkdownForDocx = (text) => {
      const lines = text.split('\n');
      const docxContent = [];
  
      lines.forEach(line => {
        if (line.startsWith('# ')) {
          // Heading 1
          docxContent.push(
            new docx.Paragraph({
              text: line.replace('# ', ''),
              heading: docx.HeadingLevel.HEADING_1
            })
          );
        } else if (line.startsWith('## ')) {
          // Heading 2
          docxContent.push(
            new docx.Paragraph({
              text: line.replace('## ', ''),
              heading: docx.HeadingLevel.HEADING_2
            })
          );
        } else if (line.startsWith('### ')) {
          // Heading 3
          docxContent.push(
            new docx.Paragraph({
              text: line.replace('### ', ''),
              heading: docx.HeadingLevel.HEADING_3
            })
          );
        } else if (line.match(/^[\-*+]\s/)) {
          // Unordered list
          docxContent.push(
            new docx.Paragraph({
              text: line.replace(/^[\-*+]\s/, ''),
              bullet: {
                level: 0
              }
            })
          );
        } else if (line.match(/^\d+\.\s/)) {
          // Ordered list
          docxContent.push(
            new docx.Paragraph({
              text: line.replace(/^\d+\.\s/, ''),
              numbering: {
                level: 0,
                reference: "my-list"
              }
            })
          );
        } else if (line.startsWith('```')) {
          // Code block (skip language identifier)
          const codeContent = line.replace(/```(\w+)?/, '').replace('```', '').trim();
          if (codeContent) {
            docxContent.push(
              new docx.Paragraph({
                children: [
                  new docx.TextRun({
                    text: codeContent,
                    font: {
                      name: "Courier New"
                    }
                  })
                ]
              })
            );
          }
        } else if (line.startsWith('> ')) {
          // Blockquote
          docxContent.push(
            new docx.Paragraph({
              text: line.replace('> ', ''),
              indent: {
                left: 720 // 0.5 inch indent
              },
              italics: true
            })
          );
        } else if (line.match(/^---+$/)) {
          // Horizontal rule
          docxContent.push(
            new docx.Paragraph({
              children: [
                new docx.TextRun({
                  text: "―".repeat(30),
                  color: "CCCCCC"
                })
              ]
            })
          );
        } else if (line.trim()) {
          // Regular paragraph
          docxContent.push(
            new docx.Paragraph({
              text: line.replace(/\*\*(.*?)\*\*/g, '$1'), // Bold
              children: [
                new docx.TextRun({
                  text: line,
                  bold: line.includes('**')
                })
              ]
            })
          );
        }
      });
  
      return docxContent;
    };
  
    const doc = new docx.Document({
      sections: [{
        children: processMarkdownForDocx(inputText)
      }],
      styles: {
        default: {
          document: {
            run: {
              font: "Calibri", // More standard Word font
              size: 24, // 12pt
            },
          },
        },
        paragraphStyles: [
          {
            id: "Heading1",
            name: "Heading 1",
            basedOn: "Normal",
            next: "Normal",
            run: {
              size: 32, // 16pt
              bold: true,
              color: "000000"
            },
            paragraph: {
              spacing: {
                before: 240,
                after: 120
              }
            }
          },
          {
            id: "Heading2",
            name: "Heading 2",
            basedOn: "Normal",
            next: "Normal",
            run: {
              size: 28, // 14pt
              bold: true,
              color: "000000"
            },
            paragraph: {
              spacing: {
                before: 200,
                after: 100
              }
            }
          }
        ]
      },
    });
  
    docx.Packer.toBlob(doc).then(blob => {
      saveAs(blob, "markdown_document.docx");
    });
  };

const handlePrint = () => {
  const printContents = document.querySelector('.prose').innerHTML;
  const originalContents = document.body.innerHTML;
  
  document.body.innerHTML = `
    <div class="prose prose-lg max-w-none">${printContents}</div>
  `;
  
  window.print();
  
  document.body.innerHTML = originalContents;
  window.location.reload(); // Restore the original page state
};

  const MyDocument = () => (
    <Document>
      <Page size="A4" style={styles.page}>
        <View>
          <Text style={styles.text}>{inputText}</Text>
        </View>
      </Page>
    </Document>
  );

  useEffect(() => {
    if (!inputText) {
      setInputText(sampleText);
    }
  }, []);

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
    <div className="flex items-center justify-between mb-8">
      <h1 className="text-4xl font-bold text-gray-900">AI Text Formatting</h1>
      <div className="flex gap-2">
  <button
    onClick={copyToClipboard}
    className="inline-flex items-center gap-2 px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
  >
    <Clipboard />
  </button>
  <PDFDownloadLink
    document={<MyDocument />}
    fileName="markdown_document.pdf"
    className="inline-flex items-center gap-2 px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
  >
    <FileText />
  </PDFDownloadLink>
  <button
    onClick={generateDocxDocument}
    className="inline-flex items-center gap-2 px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
  >
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
    </svg>
    Export as DOCX
  </button>
  <button
    onClick={handlePrint}
    className="inline-flex items-center gap-2 px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
  >
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
    </svg>
    Print
  </button>
</div>
    </div>

      <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-r mb-6">
        <div className="flex">
          <svg className="h-5 w-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="ml-3 text-sm text-blue-700">
            Type or paste your Markdown text below. The preview will update automatically.
          </p>
        </div>
      </div>

      <div className="mb-6">
        <div className="flex border-b border-gray-200">
          <button
            className={`px-4 py-2 -mb-px text-sm font-medium ${
              activeTab === 'edit'
                ? 'text-blue-600 border-b-2 border-blue-500'
                : 'text-gray-500 hover:text-gray-700'
            }`}
            onClick={() => setActiveTab('edit')}
          >
            Edit
          </button>
          <button
            className={`px-4 py-2 -mb-px text-sm font-medium ${
              activeTab === 'preview'
                ? 'text-blue-600 border-b-2 border-blue-500'
                : 'text-gray-500 hover:text-gray-700'
            }`}
            onClick={() => setActiveTab('preview')}
          >
            Preview
          </button>
        </div>

        <div className="mt-4">
          {activeTab === 'edit' ? (
            <textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Type your Markdown here..."
              className="w-full h-[600px] p-4 font-mono text-sm border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          ) : (
            <div className="border rounded-lg p-6 min-h-[600px] bg-white">
              <div 
                className="prose prose-lg max-w-none"
                dangerouslySetInnerHTML={{ __html: outputText }} 
              />
            </div>
          )}
        </div>
      </div>

      <button
        onClick={formatText}
        disabled={loading}
        className="w-full flex items-center justify-center gap-2 px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
        </svg>
        {loading ? 'Formatting...' : 'Format Text'}
      </button>
    </div>
  );
};

export default MarkdownFormatter;