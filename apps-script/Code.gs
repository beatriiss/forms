/**
 * COMO CONFIGURAR (Google Apps Script)
 * 1. Crie uma planilha no Google Sheets.
 * 2. Na planilha, vá em Extensões > Apps Script.
 * 3. Apague o código padrão e cole este arquivo inteiro. Salve.
 * 4. Em Configurações do projeto (ícone de engrenagem) > Propriedades do script,
 *    adicione a propriedade SECRET com um valor aleatório (ex.: uma senha longa).
 * 5. Implantar > Nova implantação > tipo "App da Web".
 *    Executar como: Eu. Quem pode acessar: Qualquer pessoa. Autorize o acesso.
 * 6. Copie a URL que termina em /exec e coloque no .env.local do projeto
 *    (e nas variáveis de ambiente da Vercel, se for hospedar lá):
 *      GOOGLE_SHEETS_WEBHOOK_URL=https://script.google.com/macros/s/SEU_ID/exec
 *      GOOGLE_SHEETS_SECRET=o-mesmo-valor-do-passo-4
 * As respostas vão para a aba "Respostas", criada automaticamente.
 */

function doPost(e) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);

    var contents = e && e.postData && e.postData.contents;
    if (!contents) return jsonResponse({ ok: false, error: "invalid request" });

    var body = JSON.parse(contents);
    var expected = PropertiesService.getScriptProperties().getProperty("SECRET");
    if (!expected || body.secret !== expected) {
      return jsonResponse({ ok: false, error: "unauthorized" });
    }

    var data = body.data;
    if (!data || typeof data !== "object" || Array.isArray(data)) {
      return jsonResponse({ ok: false, error: "invalid data" });
    }

    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName("Respostas") || ss.insertSheet("Respostas");

    var lastCol = sheet.getLastColumn();
    var headers = lastCol > 0 ? sheet.getRange(1, 1, 1, lastCol).getValues()[0].filter(String) : [];
    var newHeaders = Object.keys(data).filter(function (k) {
      return headers.indexOf(k) === -1;
    });

    if (newHeaders.length > 0) {
      sheet.getRange(1, headers.length + 1, 1, newHeaders.length).setValues([newHeaders]);
      headers = headers.concat(newHeaders);
      sheet.setFrozenRows(1);
    }

    var row = headers.map(function (h) {
      return data[h] !== undefined ? asPlainText(String(data[h])) : "";
    });
    sheet.appendRow(row);

    return jsonResponse({ ok: true });
  } catch (err) {
    return jsonResponse({ ok: false, error: String(err) });
  } finally {
    lock.releaseLock();
  }
}

// Impede que respostas como "=IMPORTXML(...)" sejam interpretadas como fórmula.
function asPlainText(value) {
  return /^[=+\-@]/.test(value) ? "'" + value : value;
}

function jsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
