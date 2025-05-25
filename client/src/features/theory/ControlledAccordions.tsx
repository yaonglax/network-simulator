import * as React from 'react';
import Accordion from '@mui/material/Accordion';
import AccordionDetails from '@mui/material/AccordionDetails';
import AccordionSummary from '@mui/material/AccordionSummary';
import Typography from '@mui/material/Typography';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { Button, Box } from '@mui/material';

const accordionData = [
  {
    title: "Введение в компьютерные сети",
    items: [
      "Что такое компьютерная сеть?",
      "Основные элементы сети (узлы, каналы связи, сетевые устройства)",
      "Классификация сетей (LAN, WAN, MAN, PAN)"
    ]
  },
  {
    title: "Основы сетевой коммутации",
    items: [
      "Понятие коммутации в сетях",
      "Коммутация на уровне каналов (L2) и сетевом уровне (L3)",
      "Устройства коммутации (хабы, свитчи, маршрутизаторы)"
    ]
  },
  {
    title: "MAC-адреса и IP-адреса: их роль в сети",
    items: [
      "Что такое MAC-адрес и его структура",
      "IP-адреса (IPv4 vs IPv6, публичные и приватные)",
      "Разница между MAC и IP, их взаимодействие"
    ]
  },
  {
    title: "ARP-запросы и их назначение",
    items: [
      "Принцип работы ARP (Address Resolution Protocol)",
      "ARP-таблица и ее использование",
      "ARP-spoofing (кратко о безопасности)"
    ]
  },
  {
    title: "Типы передачи данных в сетях",
    items: [
      "Unicast, Broadcast, Multicast",
      "Примеры использования каждого типа"
    ]
  },
  {
    title: "Старение MAC-таблицы в коммутаторах",
    items: [
      "Зачем нужно старение записей?",
      "Время жизни записи (aging time)",
      "Влияние на производительность сети"
    ]
  },
  {
    title: "VLAN: виртуальные локальные сети",
    items: [
      "Понятие VLAN и зачем он нужен",
      "Типы VLAN (по портам, по MAC, тегированные)",
      "Преимущества использования VLAN"
    ]
  },
  {
    title: "PING: проверка связности в сетях",
    items: [
      "Как работает утилита ping?",
      "Анализ ответов (TTL, время отклика)",
      "Диагностика проблем с помощью ping"
    ]
  },
  {
    title: "DHCP: автоматическое назначение IP-адресов",
    items: [
      "Принцип работы DHCP-сервера",
      "Процесс получения IP (DORA)",
      "Аренда адресов и обновление"
    ]
  },
  {
    title: "NAT и трансляция адресов",
    items: [
      "Зачем нужен NAT?",
      "Типы NAT (Static, Dynamic, PAT)",
      "NAT в домашних роутерах"
    ]
  }
];

export default function ControlledAccordions() {
  const [expanded, setExpanded] = React.useState<string | false>(false);

  const handleChange = (panel: string) => (event: React.SyntheticEvent, isExpanded: boolean) => {
    setExpanded(isExpanded ? panel : false);
  };

  return (
    <Box sx={{ width: '100%', maxWidth: 800, mx: 'auto', my: 4 }}>
      {accordionData.map((section, index) => (
        <Accordion
          key={`panel${index}`}
          expanded={expanded === `panel${index}`}
          onChange={handleChange(`panel${index}`)}
          sx={{
            '&.Mui-expanded': {
              margin: 0
            }
          }}
        >
          <AccordionSummary
            expandIcon={<ExpandMoreIcon />}
            aria-controls={`panel${index}-content`}
            id={`panel${index}-header`}
          >
            <Typography sx={{ width: '100%', fontWeight: 'medium' }}>
              {section.title}
            </Typography>
          </AccordionSummary>
          <AccordionDetails sx={{ p: 1 }}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {section.items.map((item, itemIndex) => (
                <Button
                  key={itemIndex}
                  fullWidth
                  sx={{
                    justifyContent: 'flex-start',
                    textTransform: 'none',
                    textAlign: 'left',

                    color: 'text.primary',
                    '&:hover': {
                      backgroundColor: 'action.hover',
                    }
                  }}
                >
                  {item}
                </Button>
              ))}
            </Box>
          </AccordionDetails>
        </Accordion>
      ))}
    </Box>
  );
}