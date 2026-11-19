// In-memory Supabase-compatible mock client used when SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY are not configured.
// Data persists for the lifetime of the server process.

type Row = Record<string, any>;

function getCol(row: Row, col: string): any {
  if (col in row) return row[col];
  const lower = col.toLowerCase();
  for (const k of Object.keys(row)) {
    if (k.toLowerCase() === lower) return row[k];
  }
  return undefined;
}

function looseEq(a: any, b: any): boolean {
  if (a === b) return true;
  if (a === null || a === undefined || b === null || b === undefined) return false;
  if (typeof a === 'boolean' || typeof b === 'boolean') {
    return String(a).toLowerCase() === String(b).toLowerCase();
  }
  if (typeof a === 'number' || typeof b === 'number') {
    const na = Number(a);
    const nb = Number(b);
    if (!Number.isNaN(na) && !Number.isNaN(nb)) return na === nb;
  }
  return String(a) === String(b);
}

function matchLike(value: any, pattern: string, caseInsensitive: boolean): boolean {
  const str = String(value ?? '');
  let regexStr = '^';
  for (let i = 0; i < pattern.length; i++) {
    const ch = pattern[i];
    if (ch === '\\' && i + 1 < pattern.length) {
      regexStr += pattern[i + 1].replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      i++;
    } else if (ch === '%') {
      regexStr += '.*';
    } else if (ch === '_') {
      regexStr += '.';
    } else {
      regexStr += ch.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }
  }
  regexStr += '$';
  const flags = caseInsensitive ? 'is' : 's';
  return new RegExp(regexStr, flags).test(str);
}

function projectRow(row: Row, cols?: string): Row {
  if (!cols || cols.trim() === '*') return { ...row };
  const requested = cols.split(',').map(s => s.trim()).filter(Boolean);
  const out: Row = {};
  for (const col of requested) {
    const val = getCol(row, col);
    if (val !== undefined) {
      out[col] = val;
    }
  }
  return out;
}

function parseOrCondition(expr: string): Array<(row: Row) => boolean> {
  return expr
    .split(',')
    .map(part => part.trim())
    .filter(Boolean)
    .map(clause => {
      const firstDot = clause.indexOf('.');
      const secondDot = firstDot >= 0 ? clause.indexOf('.', firstDot + 1) : -1;
      if (firstDot < 0 || secondDot < 0) return () => false;
      const col = clause.slice(0, firstDot);
      const op = clause.slice(firstDot + 1, secondDot);
      const rawVal = clause.slice(secondDot + 1);
      return (row: Row) => {
        const rv = getCol(row, col);
        if (op === 'eq') return looseEq(rv, rawVal);
        if (op === 'neq') return !looseEq(rv, rawVal);
        if (op === 'ilike') return matchLike(rv, rawVal, true);
        if (op === 'like') return matchLike(rv, rawVal, false);
        return false;
      };
    });
}

function createInitialTables(): Record<string, Row[]> {
  const now = Date.now();
  const days = (d: number) => new Date(now + d * 24 * 60 * 60 * 1000).toISOString();

  return {
    users: [],
    chats: [],
    seller_ratings: [],
    inquiries: [],
    platform_settings: [
      {
        id: 'platform',
        sellerlistingfee: 0,
        contactinfo: {
          organizationName: 'Antiauc Heritage Curators & Escrow Chambers',
          tagline: 'Authenticated Historical Antiquities, Rare Masterpieces & Secured Direct Negotiations',
          email: 'curator@antiauc.com',
          phone: '+1 (800) 555-8285',
          secondaryPhone: '+94 11 234 5678',
          address: 'Antiauc Vault Chambers, 45 Grand Regal Boulevard',
          cityStateCountry: 'Old Fort Quarter, Colombo 01, Sri Lanka (Global Curatorial Affiliation: London / Geneva)',
          businessHours: 'Monday – Saturday: 09:00 AM – 06:00 PM',
          inspectionHours: 'Private In-Person Viewing by Prior Appointment: 10:00 AM – 04:00 PM',
          notes:
            'For confidential museum collections, estate clearances, appraisal certificates, or physical valuation of rare heirlooms, contact our Senior Appraisal Officer.'
        },
        updatedat: new Date(now).toISOString()
      }
    ],
    items: [
      {
        id: 'item_seed_watch',
        title: 'Victorian 18k Gold Open-Face Chronometer Pocket Watch (1884)',
        category: 'Timepieces',
        era: 'Victorian (1837–1901)',
        condition: 'Excellent Historical Wear',
        dimensions: '52 mm case diameter, 98g total weight',
        provenance:
          'Hallmarked London 1884 with crisp Roman numeral enamel dial, blued-steel Breguet hands, and original key-wind escapement in working order. Acquired from a private Galle Fort estate collection.',
        city: 'Colombo',
        country: 'Sri Lanka',
        location: 'Colombo, Sri Lanka',
        startingbid: 85000,
        currentbid: 85000,
        reserveprice: 0,
        bidcount: 0,
        images: ['/images/preset-watch.webp'],
        sellerid: 'curator_colombo_horology',
        sellername: 'Colombo Horology Guild',
        sellerverified: true,
        sellerrating: 4.9,
        sellerreviewcount: 14,
        createdat: days(-2),
        endsat: days(8),
        status: 'active',
        bids: [],
        listingfeepaid: true,
        listingfeetxid: 'FEE_WAIVED'
      },
      {
        id: 'item_seed_ebony',
        title: 'Dutch Colonial Calamander & Ebony Writing Bureau (c. 1780)',
        category: 'Furniture',
        era: 'Colonial (Dutch & British)',
        condition: 'Restored Patina',
        dimensions: '112 cm W × 58 cm D × 104 cm H',
        provenance:
          'Late 18th-century Galle-workshop calamander and solid ebony slant-front bureau featuring original brass escutcheons, hand-cut dovetail drawers, and secret ledger compartments.',
        city: 'Galle',
        country: 'Sri Lanka',
        location: 'Galle, Sri Lanka',
        startingbid: 145000,
        currentbid: 145000,
        reserveprice: 0,
        bidcount: 0,
        images: ['/images/preset-ebony.webp'],
        sellerid: 'curator_galle_fort',
        sellername: 'Galle Fort Curators',
        sellerverified: true,
        sellerrating: 5.0,
        sellerreviewcount: 9,
        createdat: days(-3),
        endsat: days(7),
        status: 'active',
        bids: [],
        listingfeepaid: true,
        listingfeetxid: 'FEE_WAIVED'
      },
      {
        id: 'item_seed_delft',
        title: '18th Century VOC Dutch Delftware Blue & White Charger Plate',
        category: 'Porcelain & Ceramic',
        era: 'Colonial (Dutch & British)',
        condition: 'Pristine Antique',
        dimensions: '34 cm diameter',
        provenance:
          'Tin-glazed earthenware charger decorated in cobalt oxide underglaze with floral medallions and coastal trade motifs. Minor rim fritting consistent with age; no structural repairs.',
        city: 'Colombo',
        country: 'Sri Lanka',
        location: 'Colombo, Sri Lanka',
        startingbid: 42000,
        currentbid: 42000,
        reserveprice: 0,
        bidcount: 0,
        images: ['/images/preset-delft.webp'],
        sellerid: 'curator_galle_fort',
        sellername: 'Galle Fort Curators',
        sellerverified: true,
        sellerrating: 5.0,
        sellerreviewcount: 9,
        createdat: days(-4),
        endsat: days(6),
        status: 'active',
        bids: [],
        listingfeepaid: true,
        listingfeetxid: 'FEE_WAIVED'
      },
      {
        id: 'item_seed_brass',
        title: '19th Century Kandyan Cast Brass Ceremonial Oil Lamp (Pahana)',
        category: 'Brassware & Metal',
        era: 'Kandyan Kingdom (16th–19th c.)',
        condition: 'Excellent Historical Wear',
        dimensions: '64 cm height × 24 cm base diameter',
        provenance:
          'Lost-wax cast heavy brass standing oil lamp crowned with a traditional Serapendiya finial and five-wick reservoir. Exhibits deep natural oxidation patina from ceremonial temple stewardship.',
        city: 'Kandy',
        country: 'Sri Lanka',
        location: 'Kandy, Sri Lanka',
        startingbid: 18500,
        currentbid: 18500,
        reserveprice: 0,
        bidcount: 0,
        images: ['/images/preset-brass.webp'],
        sellerid: 'curator_kandy_vault',
        sellername: 'Kandy Heritage Vault',
        sellerverified: true,
        sellerrating: 4.8,
        sellerreviewcount: 11,
        createdat: days(-1),
        endsat: days(9),
        status: 'active',
        bids: [],
        listingfeepaid: true,
        listingfeetxid: 'FEE_WAIVED'
      },
      {
        id: 'item_seed_bronze',
        title: 'Chola-Influenced Patinated Bronze Temple Relic Vessel (c. 1650)',
        category: 'Art & Sculptures',
        era: 'Ancient & Archaic',
        condition: 'Original Aged Condition',
        dimensions: '28 cm height × 19 cm diameter',
        provenance:
          'Heavy cast bronze ceremonial vessel with incised lotus-petal bands and verdigris patina. Previously archived through Antiauc curated provenance verification.',
        city: 'Anuradhapura',
        country: 'Sri Lanka',
        location: 'Anuradhapura, Sri Lanka',
        startingbid: 65000,
        currentbid: 92000,
        reserveprice: 0,
        bidcount: 3,
        images: ['/images/preset-bronze.webp'],
        sellerid: 'curator_kandy_vault',
        sellername: 'Kandy Heritage Vault',
        sellerverified: true,
        sellerrating: 4.8,
        sellerreviewcount: 11,
        createdat: days(-18),
        endsat: days(-5),
        status: 'sold',
        bids: [],
        chosenbuyerid: 'archive_collector_1',
        chosenbuyername: 'Rohan Jayawardena',
        chosendealamount: 92000,
        listingfeepaid: true,
        listingfeetxid: 'FEE_WAIVED'
      }
    ]
  };
}

class MockQueryBuilder {
  private table: Row[];
  private mode: 'select' | 'update' | 'delete' | 'upsert' = 'select';
  private selectCols: string | undefined = '*';
  private returnAfterMutate = false;
  private updatePatch: Row | null = null;
  private upsertRows: Row[] | null = null;
  private filters: Array<(row: Row) => boolean> = [];
  private orderBy: { col: string; ascending: boolean } | null = null;
  private limitCount: number | null = null;
  private singleMode: 'none' | 'single' | 'maybeSingle' = 'none';

  constructor(table: Row[]) {
    this.table = table;
  }

  select(cols = '*') {
    if (this.mode === 'select') {
      this.selectCols = cols;
    } else {
      this.returnAfterMutate = true;
      this.selectCols = cols;
    }
    return this;
  }

  upsert(rowOrRows: Row | Row[]) {
    this.mode = 'upsert';
    this.upsertRows = Array.isArray(rowOrRows) ? rowOrRows : [rowOrRows];
    return this;
  }

  update(patch: Row) {
    this.mode = 'update';
    this.updatePatch = patch;
    return this;
  }

  delete() {
    this.mode = 'delete';
    return this;
  }

  eq(col: string, val: any) {
    this.filters.push(row => looseEq(getCol(row, col), val));
    return this;
  }

  in(col: string, vals: any[]) {
    this.filters.push(row => vals.some(v => looseEq(getCol(row, col), v)));
    return this;
  }

  ilike(col: string, pattern: string) {
    this.filters.push(row => matchLike(getCol(row, col), pattern, true));
    return this;
  }

  or(expr: string) {
    const preds = parseOrCondition(expr);
    this.filters.push(row => preds.some(p => p(row)));
    return this;
  }

  order(col: string, opts?: { ascending?: boolean }) {
    this.orderBy = { col, ascending: opts?.ascending !== false };
    return this;
  }

  limit(n: number) {
    this.limitCount = n;
    return this;
  }

  single() {
    this.singleMode = 'single';
    return this;
  }

  maybeSingle() {
    this.singleMode = 'maybeSingle';
    return this;
  }

  private execute(): { data: any; error: any } {
    const matches = (row: Row) => this.filters.every(fn => fn(row));

    if (this.mode === 'upsert') {
      const affected: Row[] = [];
      for (const raw of this.upsertRows || []) {
        const copy = { ...raw };
        const id = getCol(copy, 'id');
        const idx = id !== undefined ? this.table.findIndex(r => looseEq(getCol(r, 'id'), id)) : -1;
        if (idx >= 0) {
          this.table[idx] = { ...this.table[idx], ...copy };
          affected.push(this.table[idx]);
        } else {
          this.table.push(copy);
          affected.push(copy);
        }
      }
      if (!this.returnAfterMutate) return { data: null, error: null };
      return this.formatResult(affected);
    }

    if (this.mode === 'update') {
      const updated: Row[] = [];
      for (let i = 0; i < this.table.length; i++) {
        if (matches(this.table[i])) {
          this.table[i] = { ...this.table[i], ...(this.updatePatch || {}) };
          updated.push(this.table[i]);
        }
      }
      if (!this.returnAfterMutate) return { data: null, error: null };
      return this.formatResult(updated);
    }

    if (this.mode === 'delete') {
      const removed: Row[] = [];
      for (let i = this.table.length - 1; i >= 0; i--) {
        if (matches(this.table[i])) {
          removed.unshift(this.table[i]);
          this.table.splice(i, 1);
        }
      }
      if (!this.returnAfterMutate) return { data: null, error: null };
      return this.formatResult(removed);
    }

    // select
    let rows = this.table.filter(matches).map(r => ({ ...r }));
    if (this.orderBy) {
      const { col, ascending } = this.orderBy;
      rows.sort((a, b) => {
        const va = getCol(a, col);
        const vb = getCol(b, col);
        if (va === vb) return 0;
        if (va === undefined || va === null) return 1;
        if (vb === undefined || vb === null) return -1;
        const cmp = String(va).localeCompare(String(vb));
        return ascending ? cmp : -cmp;
      });
    }
    if (this.limitCount !== null) {
      rows = rows.slice(0, this.limitCount);
    }
    return this.formatResult(rows);
  }

  private formatResult(rows: Row[]): { data: any; error: any } {
    const projected = rows.map(r => projectRow(r, this.selectCols));
    if (this.singleMode === 'maybeSingle') {
      return { data: projected[0] ?? null, error: null };
    }
    if (this.singleMode === 'single') {
      if (!projected[0]) {
        return { data: null, error: { code: 'PGRST116', message: 'Row not found' } };
      }
      return { data: projected[0], error: null };
    }
    return { data: projected, error: null };
  }

  then<TResult1 = { data: any; error: any }, TResult2 = never>(
    onfulfilled?: ((value: { data: any; error: any }) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | null
  ): Promise<TResult1 | TResult2> {
    return Promise.resolve(this.execute()).then(onfulfilled, onrejected);
  }
}

export function createMockSupabaseClient() {
  const tables = createInitialTables();

  return {
    from(tableName: string) {
      if (!tables[tableName]) {
        tables[tableName] = [];
      }
      return new MockQueryBuilder(tables[tableName]);
    },
    channel(_name: string) {
      const chan = {
        on(_event: string, _filter: any, _cb: () => void) {
          return chan;
        },
        subscribe() {
          return chan;
        }
      };
      return chan;
    },
    storage: {
      async listBuckets() {
        return { data: [], error: null };
      },
      async createBucket(_name: string, _opts: any) {
        return { data: {}, error: null };
      },
      from(_bucket: string) {
        return {
          async upload(_path: string, _buffer: Buffer, _opts: any) {
            return { data: null, error: new Error('Mock storage uses inline data URLs') };
          },
          getPublicUrl(objectPath: string) {
            return { data: { publicUrl: objectPath } };
          }
        };
      }
    }
  };
}
