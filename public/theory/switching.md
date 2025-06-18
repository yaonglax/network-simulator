# Основы сетевой коммутации

<h2 id="switching-concept">Понятие коммутации в сетях</h2>

<p>Коммутация в компьютерных сетях — это процесс перенаправления данных от отправителя к получателю через промежуточные сетевые устройства. В отличие от широковещательной передачи, коммутация обеспечивает адресную доставку информации только нужному получателю.</p>

<div style="position: relative; display: flex; justify-content: center; flex-direction: column; align-items: center; margin: 20px 0;">
  <img width="60%" src="/theory/switching.png" style="border-radius: 0.5rem;" />
  <div class='note'>
    На схеме показан принцип коммутации: данные от компьютера A передаются через коммутатор напрямую к компьютеру C, минуя другие устройства в сети.
    <img src="./cat4.svg" style="position: absolute; bottom: 0; right: 0; translate: 50% 50%; transform: rotate(30deg); width: 120px;">
  </div>
</div>

<h2 id="switching-layers">Коммутация на уровне каналов (L2) и сетевом уровне (L3)</h2>

<div style="display: flex; gap: 20px; margin: 20px 0;">
  <div style="flex: 1; border: 1px solid var(--detail-gray); border-radius: 0.5rem; padding: 15px;">
    <h3 style="margin-top: 0;">Коммутация L2 (канальный уровень)</h3>
    <ul>
      <li>Работает с MAC-адресами</li>
      <li>Использует коммутаторы (switches)</li>
      <li>Обеспечивает передачу кадров (frames)</li>
      <li>Действует в пределах одной подсети</li>
    </ul>
  </div>
  <div style="flex: 1; border: 1px solid var(--detail-gray); border-radius: 0.5rem; padding: 15px;">
    <h3 style="margin-top: 0;">Коммутация L3 (сетевой уровень)</h3>
    <ul>
      <li>Работает с IP-адресами</li>
      <li>Использует маршрутизаторы (routers)</li>
      <li>Оперирует пакетами (packets)</li>
      <li>Маршрутизирует трафик между разными сетями</li>
    </ul>
  </div>
</div>

<div style="position: relative; display: flex; justify-content: center; flex-direction: column; align-items: center; margin: 20px 0;">
  <div class="note">
    <strong>Ключевое отличие:</strong> L2-коммутация работает внутри одной сети, L3-коммутация связывает разные сети. Современные L3-коммутаторы сочетают обе функции.
    <img src="./cat4.svg" style="position: absolute; bottom: 0; right: 0; translate: 50% 50%; transform: rotate(30deg); width: 120px;">
  </div>
</div>

<h2 id="switching-devices">Устройства коммутации</h2>

<table>
  <thead>
    <tr>
      <th>Устройство</th>
      <th>Уровень OSI</th>
      <th>Функция</th>
      <th>Пример использования</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><strong>Хаб (концентратор)</strong></td>
      <td>L1 (физический)</td>
      <td>Повторяет сигнал на все порты</td>
      <td>Устаревшие сети 10BASE-T</td>
    </tr>
    <tr>
      <td><strong>Коммутатор (switch)</strong></td>
      <td>L2 (канальный)</td>
      <td>Передает кадры по MAC-адресам</td>
      <td>Локальная сеть офиса</td>
    </tr>
    <tr>
      <td><strong>Маршрутизатор (router)</strong></td>
      <td>L3 (сетевой)</td>
      <td>Маршрутизирует пакеты между сетями</td>
      <td>Подключение LAN к интернету</td>
    </tr>
    <tr>
      <td><strong>L3-коммутатор</strong></td>
      <td>L2+L3</td>
      <td>Комбинирует функции switch и router</td>
      <td>Корпоративные сети VLAN</td>
    </tr>
  </tbody>
</table>

<div style="position: relative; display: flex; justify-content: center; flex-direction: column; align-items: center; margin: 20px 0;">
  <div class="note">
    <strong>Эволюция устройств:</strong> Хабы почти не используются, их заменили коммутаторы. Современные маршрутизаторы часто включают функции коммутатора, файрвола и точки доступа.
    <img src="./cat4.svg" style="position: absolute; bottom: 0; right: 0; translate: 50% 50%; transform: rotate(30deg); width: 120px;">
  </div>
  <img src="/theory/net-devices.jpg" style="width: 60%; margin-top: 25px; border-radius: 0.5rem;">
</div>
<h2 id="flooding-mechanism">Механизм Flooding в коммутаторах</h2>

<p>Flooding (затопление) — это процесс, при котором коммутатор отправляет входящий кадр на все свои порты, кроме порта-отправителя. Это происходит в следующих случаях:</p>

<div style="display: flex; gap: 20px; margin: 20px 0;">
  <div style="flex: 1; border: 1px solid var(--detail-gray); border-radius: 0.5rem; padding: 15px;">
    <h3 style="margin-top: 0;">Когда возникает flooding?</h3>
    <ul>
      <li>MAC-адрес получателя отсутствует в таблице коммутации</li>
      <li>Кадр является широковещательным (MAC FF:FF:FF:FF:FF:FF)</li>
      <li>Кадр является multicast-адресом (если не настроено IGMP snooping)</li>
      <li>При получении BPDU-пакетов протокола STP</li>
    </ul>
  </div>
  <div style="flex: 1; border: 1px solid var(--detail-gray); border-radius: 0.5rem; padding: 15px;">
    <h3 style="margin-top: 0;">Как работает процесс?</h3>
    <ol>
      <li>Коммутатор получает кадр на входной порт</li>
      <li>Проверяет MAC-таблицу для адреса назначения</li>
      <li>Если адрес не найден — кадр флудится на все порты VLAN</li>
      <li>Ответ от получателя обновляет MAC-таблицу</li>
    </ol>
  </div>
</div>

<div style="position: relative; display: flex; justify-content: center; flex-direction: column; align-items: center; margin: 20px 0;">
  <img src="/theory/flooding.png" style="width: 60%; border-radius: 0.5rem;">
  <div class="note">
    <strong>Важно:</strong> Flooding — нормальное поведение для неизвестных MAC-адресов, но избыточный flooding может указывать на проблемы в сети (петли, атаки).
    <img src="./cat4.svg" style="position: absolute; bottom: 0; right: 0; translate: 50% 50%; transform: rotate(30deg); width: 120px;">
  </div>
</div>

<style>
  table {
    width: 100%;
    border-collapse: collapse;
    margin: 15px 0;
  }
  
  th, td {
    padding: 12px 15px;
    border: 1px solid var(--detail-gray);
    text-align: left;
  }
  
  th {
    background-color: var(--element-gray);
    font-weight: bold;
  }
  
  tr:nth-child(even) {
    background-color: var(--element-gray);
  }

  .note {
    border-left: 4px solid var(--highlight-purple);
    background-color: var(--element-gray);
    width: 60%;
    min-height: 60px;
    border-radius: 0.5rem;
    padding: 15px;
    position: relative;
    margin-top: 15px;
  }
</style>
