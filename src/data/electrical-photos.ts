export interface ElectricalPhoto {
  slug: string;
  src: string;
  alt: string;
}

export const electricalPhotos: ElectricalPhoto[] = [
  {
    slug: 'bay-overview-1',
    src: '/images/electrical/electrical-bay-overview-1.webp',
    alt: 'Full 12V electrical bay showing a LiFePO4 lithium battery, Victron MPPT solar charge controller, busbar and labelled fuse block',
  },
  {
    slug: 'bay-mppt-busbar-1',
    src: '/images/electrical/electrical-bay-mppt-busbar-1.webp',
    alt: 'Close-up of a Victron SmartSolar MPPT charge controller wired to a positive busbar and fuse block',
  },
  {
    slug: 'bay-mppt-dcdc-busbar-1',
    src: '/images/electrical/electrical-bay-mppt-dcdc-busbar-1.webp',
    alt: 'Victron MPPT solar charge controller and Orion DC-DC charger wired to positive and negative busbars',
  },
  {
    slug: 'bay-fusebox-labelled-1',
    src: '/images/electrical/electrical-bay-fusebox-labelled-1.webp',
    alt: 'Labelled fuse block (Fridge, Air, Fuse Box, DC-DC) and USB, light, water and fan distribution block',
  },
  {
    slug: 'bay-overview-2',
    src: '/images/electrical/electrical-bay-overview-2.webp',
    alt: 'Electrical bay installed behind the cab, showing the lithium battery, solar controller and fuse block in context',
  },
  {
    slug: 'bay-cerbo-gx-solar-1',
    src: '/images/electrical/electrical-bay-cerbo-gx-solar-1.webp',
    alt: 'Victron Cerbo GX, MPPT solar charge controller, Orion DC-DC charger and labelled fuse block in a honeycomb-panelled electrical bay',
  },
  {
    slug: 'monitor-outlet-timber-cabinet-1',
    src: '/images/electrical/electrical-monitor-outlet-timber-cabinet-1.webp',
    alt: 'Victron touchscreen monitor showing live AC load, inverter, battery and alternator stats, next to a USB port, accessory socket and 240V GPO outlet in timber cabinetry',
  },
  {
    slug: 'monitor-outlet-timber-bench-1',
    src: '/images/electrical/electrical-monitor-outlet-timber-bench-1.webp',
    alt: 'Victron battery monitor at 95%, a USB port and a 240V GPO outlet built into a timber bench top',
  },
  {
    slug: 'monitor-outlet-tailgate-1',
    src: '/images/electrical/electrical-monitor-outlet-tailgate-1.webp',
    alt: 'Victron battery monitor, USB port, 240V GPO outlet and switch panel built into a carpeted tailgate panel',
  },
  {
    slug: 'monitor-outlet-tailgate-2',
    src: '/images/electrical/electrical-monitor-outlet-tailgate-2.webp',
    alt: 'Victron battery monitor at 99% and a 240V GPO outlet built into a carpeted tailgate panel',
  },
];
