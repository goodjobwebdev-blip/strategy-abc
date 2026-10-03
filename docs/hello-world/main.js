'use strict';

const greetingButton = document.getElementById('greet');
const statusMessage = document.getElementById('status');

greetingButton.addEventListener('click', () => {
  statusMessage.textContent = 'Salve! Hello World. Легион готов — начало положено.';
  greetingButton.textContent = 'Приветствовать ещё раз';
});
