/**
 * OceanSmart — Single Source of Truth untuk data wilayah
 * Semua halaman harus import dari sini, bukan mendefinisikan sendiri.
 */

export const PROVINCES = [
  { id: 'jabar',   name: 'Jawa Barat' },
  { id: 'banten',  name: 'Banten' },
  { id: 'dki',     name: 'DKI Jakarta (Kep. Seribu)' },
  { id: 'jateng',  name: 'Jawa Tengah' },
  { id: 'jatim',   name: 'Jawa Timur' },
  { id: 'diy',     name: 'DI Yogyakarta' },
  { id: 'bali',    name: 'Bali' },
  { id: 'sulsel',  name: 'Sulawesi Selatan' },
  { id: 'sultra',  name: 'Sulawesi Tenggara' },
  { id: 'sulut',   name: 'Sulawesi Utara' },
  { id: 'ntt',     name: 'Nusa Tenggara Timur' },
  { id: 'maluku',  name: 'Maluku' },
  { id: 'papua',   name: 'Papua Barat Daya' },
];

export const KABUPATEN_BY_PROVINCE = {
  jabar: [
    { id: 'all',          name: 'Semua Daerah Pesisir Jawa Barat' },
    { id: 'Pangandaran',  name: 'Kab. Pangandaran (Pesisir Selatan)' },
    { id: 'Sukabumi',     name: 'Kab. Sukabumi / Pelabuhan Ratu' },
    { id: 'Indramayu',    name: 'Kab. Indramayu (Pantura)' },
    { id: 'Cirebon',      name: 'Kota & Kab. Cirebon (Pantura)' },
    { id: 'Karawang',     name: 'Kab. Karawang (Pantura)' },
    { id: 'Subang',       name: 'Kab. Subang (Pantura)' },
  ],
  banten: [
    { id: 'all',       name: 'Semua Daerah Pesisir Banten' },
    { id: 'Pandeglang',name: 'Kab. Pandeglang' },
    { id: 'Serang',    name: 'Kab. Serang' },
    { id: 'Lebak',     name: 'Kab. Lebak' },
  ],
  dki: [
    { id: 'all',            name: 'Semua Daerah Kepulauan Seribu' },
    { id: 'Seribu Utara',   name: 'Kec. Kepulauan Seribu Utara' },
    { id: 'Seribu Selatan', name: 'Kec. Kepulauan Seribu Selatan' },
  ],
  jateng: [
    { id: 'all',          name: 'Semua Daerah Pesisir Jawa Tengah' },
    { id: 'Karimunjawa', name: 'Kab. Jepara / Karimunjawa' },
    { id: 'Cilacap',     name: 'Kab. Cilacap' },
    { id: 'Kebumen',     name: 'Kab. Kebumen' },
  ],
  jatim: [
    { id: 'all',         name: 'Semua Daerah Pesisir Jawa Timur' },
    { id: 'Banyuwangi',  name: 'Kab. Banyuwangi' },
    { id: 'Situbondo',   name: 'Kab. Situbondo' },
    { id: 'Malang',      name: 'Kab. Malang' },
    { id: 'Pacitan',     name: 'Kab. Pacitan' },
  ],
  diy: [
    { id: 'all',          name: 'Semua Daerah Pesisir DIY' },
    { id: 'Parangtritis', name: 'Parangtritis / Bantul' },
    { id: 'Kulonprogo',   name: 'Kab. Kulon Progo' },
  ],
  bali: [
    { id: 'all',         name: 'Semua Daerah Pesisir Bali' },
    { id: 'Nusa Penida', name: 'Kec. Nusa Penida (Klungkung)' },
    { id: 'Buleleng',    name: 'Kab. Buleleng / Lovina' },
    { id: 'Badung',      name: 'Kab. Badung / Kuta' },
    { id: 'Gianyar',     name: 'Kab. Gianyar' },
  ],
  sulsel: [
    { id: 'all',       name: 'Semua Daerah Pesisir Sulawesi Selatan' },
    { id: 'Makassar',  name: 'Kota Makassar' },
    { id: 'Takalar',   name: 'Kab. Takalar' },
  ],
  sultra: [
    { id: 'all',       name: 'Semua Daerah Pesisir Sulawesi Tenggara' },
    { id: 'Wakatobi',  name: 'Kab. Wakatobi' },
    { id: 'Buton',     name: 'Kab. Buton' },
  ],
  sulut: [
    { id: 'all',     name: 'Semua Daerah Pesisir Sulawesi Utara' },
    { id: 'Bunaken', name: 'Kota Manado / Bunaken' },
    { id: 'Sangihe', name: 'Kab. Kepulauan Sangihe' },
  ],
  ntt: [
    { id: 'all',              name: 'Semua Daerah Pesisir NTT' },
    { id: 'Manggarai Barat',  name: 'Kab. Manggarai Barat / Komodo' },
    { id: 'Flores',           name: 'Kab. Flores Timur' },
  ],
  maluku: [
    { id: 'all',           name: 'Semua Daerah Pesisir Maluku' },
    { id: 'Maluku Tengah', name: 'Kab. Maluku Tengah' },
    { id: 'Ambon',         name: 'Kota Ambon' },
  ],
  papua: [
    { id: 'all',        name: 'Semua Daerah Papua Barat Daya' },
    { id: 'Raja Ampat', name: 'Kab. Raja Ampat' },
    { id: 'Sorong',     name: 'Kab. Sorong' },
  ],
};

/**
 * Filter sensors dari backend berdasarkan provinsi dan kabupaten/wilayah.
 * TIDAK ada dummy sensor — semua dari database.
 */
export function getSensorsForRegion(provinceId, kabupatenId, allSensors) {
  if (!allSensors || allSensors.length === 0) return [];

  // Semua wilayah: tidak filter
  if (provinceId === 'all' && kabupatenId === 'all') return allSensors;

  // Filter kabupaten/wilayah spesifik
  if (kabupatenId && kabupatenId !== 'all') {
    return allSensors.filter(s =>
      (s.wilayah || '').toLowerCase() === kabupatenId.toLowerCase() ||
      s.nama_lokasi.toLowerCase().includes(kabupatenId.toLowerCase())
    );
  }

  // Filter by provinsi saja
  if (provinceId && provinceId !== 'all') {
    const provName = PROVINCES.find(p => p.id === provinceId)?.name || '';
    return allSensors.filter(s =>
      (s.provinsi || '').toLowerCase().includes(provName.toLowerCase().split(' ').slice(-1)[0].toLowerCase()) ||
      (s.provinsi || '').toLowerCase() === provName.toLowerCase()
    );
  }

  return allSensors;
}
