import * as React from 'react';
import Accordion from '@mui/material/Accordion';
import AccordionDetails from '@mui/material/AccordionDetails';
import AccordionSummary from '@mui/material/AccordionSummary';
import Typography from '@mui/material/Typography';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { Button, Box } from '@mui/material';

interface AccordionItem {
  label: string;
  anchor: string;
}

interface AccordionSection {
  title: string;
  mdFile: string;
  items: AccordionItem[];
}

interface ControlledAccordionsProps {
  onTopicSelect?: (mdFile: string, anchor?: string) => void;
  expandedIndex?: number | null;
}

export const accordionData: AccordionSection[] = [
  {
    mdFile: "intro.md",
    title: "Введение в компьютерные сети",
    items: [
      { label: "Что такое компьютерная сеть?", anchor: "what-is-network" },
      { label: "Основные элементы сети (узлы, каналы связи, сетевые устройства)", anchor: "network-elements" },
      { label: "Классификация сетей (LAN, WAN, MAN, PAN)", anchor: "network-types" }
    ]
  },
  {
    mdFile: "switching.md",
    title: "Основы сетевой коммутации",
    items: [
      { label: "Понятие коммутации в сетях", anchor: "switching-concept" },
      { label: "Коммутация на уровне каналов (L2) и сетевом уровне (L3)", anchor: "switching-layers" },
      { label: "Устройства коммутации (хабы, свитчи, маршрутизаторы)", anchor: "switching-devices" },
      { label: "Метод Flooding в коммутаторах", anchor: "flooding-mechanism" }
    ]
  },
  {
    mdFile: "mac-ip.md",
    title: "MAC-адреса и IP-адреса: их роль в сети",
    items: [
      { label: "Что такое MAC-адрес и его структура", anchor: "mac-address-structure" },
      { label: "IP-адреса (IPv4 vs IPv6, публичные и приватные)", anchor: "ip-addresses" },
      { label: "Разница между MAC и IP, их взаимодействие", anchor: "mac-vs-ip" }
    ]
  },
  {
    mdFile: "arp.md",
    title: "ARP-запросы и их назначение",
    items: [
      { label: "Принцип работы ARP (Address Resolution Protocol)", anchor: "arp-principle" },
      { label: "ARP-таблица и ее использование", anchor: "arp-table" },
      { label: "ARP-spoofing (кратко о безопасности)", anchor: "arp-spoofing" }
    ]
  },
  {
    mdFile: "data.md",
    title: "Типы передачи данных в сетях",
    items: [
      { label: "Unicast, Broadcast, Multicast", anchor: "data-types" },
      { label: "Примеры использования каждого типа", anchor: "data-types-examples" }
    ]
  },
  {
    mdFile: "mac-table.md",
    title: "Старение MAC-таблицы в коммутаторах",
    items: [
      { label: "Зачем нужно старение записей?", anchor: "mac-aging-why" },
      { label: "Время жизни записи (aging time)", anchor: "mac-aging-time" },
      { label: "Влияние на производительность сети", anchor: "mac-aging-performance" }
    ]
  },
  {
    mdFile: "vlan.md",
    title: "VLAN: виртуальные локальные сети",
    items: [
      { label: "Понятие VLAN и зачем он нужен", anchor: "vlan-concept" },
      { label: "Типы VLAN (по портам, по MAC, тегированные)", anchor: "vlan-types" },
      { label: "Преимущества использования VLAN", anchor: "vlan-advantages" }
    ]
  },
  {
    mdFile: "ping.md",
    title: "PING: проверка связности в сетях",
    items: [
      { label: "Как работает утилита ping?", anchor: "ping-how" },
      { label: "Анализ ответов (TTL, время отклика)", anchor: "ping-analysis" },
      { label: "Диагностика проблем с помощью ping", anchor: "ping-diagnostics" }
    ]
  },
  {
    mdFile: "dhcp.md",
    title: "DHCP: автоматическое назначение IP-адресов",
    items: [
      { label: "Принцип работы DHCP-сервера", anchor: "dhcp-principle" },
      { label: "Процесс получения IP (DORA)", anchor: "dhcp-dora" },
      { label: "Аренда адресов и обновление", anchor: "dhcp-lease" }
    ]
  },
  {
    mdFile: "nat.md",
    title: "NAT и трансляция адресов",
    items: [
      { label: "Зачем нужен NAT?", anchor: "nat-why" },
      { label: "Типы NAT (Static, Dynamic, PAT)", anchor: "nat-types" },
      { label: "NAT в домашних роутерах", anchor: "nat-home" }
    ]
  }
];

export default function ControlledAccordions({ onTopicSelect, expandedIndex }: ControlledAccordionsProps) {
  const [expanded, setExpanded] = React.useState<string | false>(expandedIndex != null ? `panel${expandedIndex}` : false);

  const handleChange = (panel: string) => (event: React.SyntheticEvent, isExpanded: boolean) => {
    setExpanded(isExpanded ? panel : false);
  };

  React.useEffect(() => {
    setExpanded(expandedIndex != null ? `panel${expandedIndex}` : false);
  }, [expandedIndex]);

  return (
    <Box id="theory-accordion" sx={{ width: '100%', maxWidth: 800, mx: 'auto', my: 4, backgroundColor: 'var(--bg-dark-gray)' }}>
      {accordionData.map((section, index) => (
        <Accordion
          key={`panel${index}`}
          expanded={expanded === `panel${index}`}
          onChange={handleChange(`panel${index}`)}
          sx={{
            backgroundColor: 'var(--bg-dark-gray)',
            color: 'var(--text-gray)',
            '&.Mui-expanded': {
              margin: 0
            },
            '&::before': {
              backgroundColor: 'var(--element-gray)',
            },
          }}
        >
          <AccordionSummary
            expandIcon={<ExpandMoreIcon sx={{ color: 'var(--text-gray)' }} />}
            aria-controls={`panel${index}-content`}
            id={`panel${index}-header`}
          >
            <Typography sx={{ width: '100%', fontWeight: 'medium', color: 'var(--text-gray)' }}>
              {section.title}
            </Typography>
          </AccordionSummary>
          <AccordionDetails sx={{ p: 1 }}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, color: 'var(--text-gray)' }}>
              {section.items.map((item, itemIndex) => (
                <Button
                  key={itemIndex}
                  id={itemIndex === 0 ? 'theory-topic-0' : ''}
                  fullWidth
                  sx={{
                    justifyContent: 'flex-start',
                    textTransform: 'none',
                    textAlign: 'left',
                    color: 'var(--text-gray)',
                    '&:hover': {
                      backgroundColor: 'action.hover',
                    }
                  }}
                  onClick={() => onTopicSelect && onTopicSelect(section.mdFile, item.anchor)}
                >
                  {item.label}
                </Button>
              ))}
            </Box>
          </AccordionDetails>
        </Accordion>
      ))}
    </Box>
  );
}