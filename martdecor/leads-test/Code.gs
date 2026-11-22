function doGet() {
  return HtmlService.createHtmlOutput(`<!doctype html><html lang="ru"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>МАРТдекор — тест заявок</title>
  <body style="max-width:38rem;margin:3rem auto;padding:0 1rem;font:1rem system-ui">
  <h1>МАРТдекор — тест заявок</h1><p>Будет отправлена вымышленная заявка «Тестовый клиент», телефон 0000000000.</p>
  <button id="send">Отправить тестовую заявку</button><p id="status" role="status"></p>
  <script>
  const button = document.getElementById('send');
  const status = document.getElementById('status');
  button.onclick = () => {
    button.disabled = true;
    status.textContent = 'Проверяем доставку…';
    google.script.run.withSuccessHandler(result => {
      status.textContent = result;
      button.disabled = false;
    }).withFailureHandler(() => {
      status.textContent = 'Сбой проверки. Посмотрите, появилась ли заявка в таблице, прежде чем повторять.';
      button.disabled = false;
    }).sendTestLead();
  };
  </script></body></html>`);
}

function sendTestLead() {
  const props = PropertiesService.getScriptProperties();
  const sheetId = props.getProperty('SPREADSHEET_ID');
  const emailTo = props.getProperty('NOTIFICATION_EMAIL');
  if (!sheetId || !emailTo) return 'Укажите SPREADSHEET_ID и NOTIFICATION_EMAIL в свойствах скрипта.';
  const token = props.getProperty('TELEGRAM_BOT_TOKEN') || '';
  const chatId = props.getProperty('TELEGRAM_CHAT_ID') || '';
  if (!/^\d+:[\w-]+$/.test(token) || !/^\d+$/.test(chatId)) {
    return 'Укажите TELEGRAM_BOT_TOKEN и TELEGRAM_CHAT_ID в свойствах скрипта.';
  }
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(5000)) return 'Уже идёт проверка. Дождитесь её завершения.';
  try {
    const sheet = SpreadsheetApp.openById(sheetId).getSheets()[0];
    const id = Utilities.getUuid();
    const message = 'МАРТдекор — тестовая заявка ' + id + '\nТестовый клиент · 0000000000\nПроверка формы';
    const row = sheet.getLastRow() + 1;
    sheet.getRange(row, 5).setNumberFormat('@');
    sheet.getRange(row, 1, 1, 8).setValues([[id, new Date().toISOString(),
      'Тест', 'Тестовый клиент', '0000000000', 'Проверка формы', 'Ожидает', 'Ожидает']]);
    SpreadsheetApp.flush();

    let telegram = 'Ошибка';
    try {
      const response = UrlFetchApp.fetch('https://api.telegram.org/bot' + token + '/sendMessage', {
        method: 'post', contentType: 'application/json',
        payload: JSON.stringify({chat_id: chatId, text: message}), muteHttpExceptions: true
      });
      if (response.getResponseCode() === 200 && JSON.parse(response.getContentText()).ok) telegram = 'Отправлено';
    } catch (_) {}
    sheet.getRange(row, 7).setValue(telegram);

    let email = 'Ошибка';
    try {
      MailApp.sendEmail(emailTo, 'МАРТдекор — тестовая заявка ' + id, message);
      email = 'Отправлено';
    } catch (_) {}
    sheet.getRange(row, 8).setValue(email);
    SpreadsheetApp.flush();
    return 'Заявка ' + id + ' записана в таблицу. Telegram: ' + telegram + '. Почта: ' + email + '.';
  } finally {
    lock.releaseLock();
  }
}

/** Run once from the editor. The pairing phrase is a temporary Script Property. */
function connectTelegramChat() {
  const props = PropertiesService.getScriptProperties();
  const token = props.getProperty('TELEGRAM_BOT_TOKEN') || '';
  const phrase = props.getProperty('TELEGRAM_SETUP_PHRASE') || '';
  if (!/^\d+:[\w-]+$/.test(token) || phrase.length < 12) {
    throw new Error('Проверьте токен и задайте временную фразу длиной от 12 символов.');
  }
  let updates;
  try {
    const response = UrlFetchApp.fetch('https://api.telegram.org/bot' + token + '/getUpdates', {
      method: 'post', contentType: 'application/json',
      payload: JSON.stringify({limit: 100, timeout: 0}), muteHttpExceptions: true
    });
    updates = JSON.parse(response.getContentText());
  } catch (_) {
    throw new Error('Запрос к Telegram не удался.');
  }
  if (!updates.ok) {
    throw new Error(updates.error_code === 409
      ? 'Бот подключён к другому обработчику. Задайте TELEGRAM_CHAT_ID вручную.'
      : 'Telegram отклонил запрос. Проверьте, что токен действующий.');
  }
  const ids = new Set(updates.result
    .map(update => update.message)
    .filter(message => message?.chat?.type === 'private' && message.text === phrase)
    .map(message => String(message.chat.id)));
  if (ids.size !== 1) {
    throw new Error('Отправьте временную фразу в личный чат с ботом и запустите функцию снова.');
  }
  props.setProperty('TELEGRAM_CHAT_ID', [...ids][0]);
  props.deleteProperty('TELEGRAM_SETUP_PHRASE');
  console.info('Личный чат Telegram привязан.');
}
