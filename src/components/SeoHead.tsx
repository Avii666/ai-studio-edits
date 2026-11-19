import React, { useEffect } from 'react';
import { useApp } from '../context/AppContext';

export const SeoHead: React.FC = () => {
  const {
    selectedItem,
    activeNavTab,
    selectedCategory,
    searchQuery,
    items,
    formatCurrency
  } = useApp();

  useEffect(() => {
    // 1. Determine dynamic title and description based on current application state
    let pageTitle = 'Antiauc | Curated Antique & Bidding Marketplace';
    let metaDescription =
      'Antiauc is a premier verified antique auction marketplace. Discover rare collectibles, horology, historic coins, and curated artifacts with live bidding and secure deal rooms.';
    const resolvePublicImageUrl = (raw?: string): string => {
      const fallback = `${window.location.origin}/antiauc-logo.webp`;
      if (!raw || typeof raw !== 'string') return fallback;
      const trimmed = raw.trim();
      if (!trimmed || trimmed.startsWith('data:') || trimmed.startsWith('blob:')) return fallback;
      if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) return trimmed;
      if (trimmed.startsWith('/')) return `${window.location.origin}${trimmed}`;
      return fallback;
    };

    let ogImage = `${window.location.origin}/antiauc-logo.webp`;
    let ogType = 'website';

    if (selectedItem) {
      // Dynamic item view title & description
      const priceText = formatCurrency(selectedItem.currentBid || selectedItem.startingBid);
      pageTitle = `${selectedItem.title} (${selectedItem.era}) | Current Bid ${priceText} | Antiauc`;
      metaDescription = selectedItem.provenance 
        ? `${selectedItem.title} (${selectedItem.era}, ${selectedItem.condition}): ${selectedItem.provenance.slice(0, 130)}... Verified curatorial listing on Antiauc.`
        : `Bid on ${selectedItem.title} (${selectedItem.era}), authentic antique in ${selectedItem.category} starting from ${priceText} on Antiauc.`;
      
      if (selectedItem.images && selectedItem.images.length > 0) {
        ogImage = resolvePublicImageUrl(selectedItem.images[0]);
      }
      ogType = 'product';
    } else {
      switch (activeNavTab) {
        case 'browse':
          if (searchQuery.trim()) {
            pageTitle = `Search: "${searchQuery}" | Antiauc Antiques`;
            metaDescription = `Browse authentic antique lots and live auctions matching "${searchQuery}" on Antiauc. Verified provenance and collector guarantees.`;
          } else if (selectedCategory && selectedCategory.toLowerCase() !== 'all') {
            pageTitle = `${selectedCategory} Antiques & Live Auctions | Antiauc`;
            metaDescription = `Explore curated ${selectedCategory.toLowerCase()} antiques, rare collector items, and historic heirlooms on Antiauc.`;
          } else {
            pageTitle = 'Antiauc | Curated Antique Vault & Live Bidding Marketplace';
            metaDescription =
              'Verified antique auction marketplace with live bidding starting from Rs. 300, collector archives, authentic provenance, and private deal chats.';
          }
          break;
        case 'seller_hub':
          pageTitle = 'Curatorial Consignment & Seller Hub | Antiauc';
          metaDescription =
            'Consign and list authentic antiques, fine art, and rare collectibles. Transparent listing fees, verified buyers, and appraisal reviews.';
          break;
        case 'my_bids':
          pageTitle = 'Collector Bids & Active Watchlist | Antiauc';
          metaDescription =
            'Track your live auction bids, outbid alerts, and saved antique lots in real time on Antiauc.';
          break;
        case 'chats':
          pageTitle = 'Private Deal Rooms & Escrow Negotiation | Antiauc';
          metaDescription =
            'Direct, secure buyer-seller negotiations for high-value antique lots with anti-fraud identity protection.';
          break;
        case 'contact':
          pageTitle = 'Curatorial Inquiries & Antique Appraisals | Antiauc Desk';
          metaDescription =
            'Contact the Antiauc curatorial desk for lot authentication, consignment disputes, or antique appraisal assistance.';
          break;
        case 'admin':
          pageTitle = 'Curatorial Registry & Admin Control | Antiauc';
          metaDescription =
            'Administrative control center for lot approvals, fee governance, and collector identity verification.';
          break;
        default:
          break;
      }
    }

    // 2. Update document.title
    document.title = pageTitle;

    // Helper to update or create a <meta> tag
    const updateMetaTag = (attributeName: string, attributeValue: string, content: string) => {
      let element = document.querySelector(`meta[${attributeName}="${attributeValue}"]`) as HTMLMetaElement | null;
      if (!element) {
        element = document.createElement('meta');
        element.setAttribute(attributeName, attributeValue);
        document.head.appendChild(element);
      }
      element.setAttribute('content', content);
    };

    // Helper to update or create a <link> tag
    const updateLinkTag = (rel: string, href: string) => {
      let element = document.querySelector(`link[rel="${rel}"]`) as HTMLLinkElement | null;
      if (!element) {
        element = document.createElement('link');
        element.setAttribute('rel', rel);
        document.head.appendChild(element);
      }
      element.setAttribute('href', href);
    };

    // 3. Update Standard Meta & OpenGraph / Twitter Tags
    const canonicalUrl = `${window.location.origin}${window.location.pathname}`;
    updateMetaTag('name', 'description', metaDescription);
    updateMetaTag('property', 'og:title', pageTitle);
    updateMetaTag('property', 'og:description', metaDescription);
    updateMetaTag('property', 'og:image', ogImage);
    updateMetaTag('property', 'og:type', ogType);
    updateMetaTag('property', 'og:url', canonicalUrl);
    updateMetaTag('property', 'og:site_name', 'Antiauc Marketplace');
    updateMetaTag('name', 'twitter:card', 'summary_large_image');
    updateMetaTag('name', 'twitter:title', pageTitle);
    updateMetaTag('name', 'twitter:description', metaDescription);
    updateMetaTag('name', 'twitter:image', ogImage);
    updateLinkTag('canonical', canonicalUrl);

    // 4. Build Structured Schema.org JSON-LD graph
    const schemaGraph: any[] = [
      // WebSite with Sitelinks Searchbox
      {
        '@type': 'WebSite',
        '@id': `${window.location.origin}/#website`,
        'url': window.location.origin,
        'name': 'Antiauc',
        'description': 'Verified Antique Auction Marketplace with Live Bidding',
        'potentialAction': {
          '@type': 'SearchAction',
          'target': {
            '@type': 'EntryPoint',
            'urlTemplate': `${window.location.origin}/?search={search_term_string}`
          },
          'query-input': 'required name=search_term_string'
        }
      },
      // WebApplication
      {
        '@type': 'WebApplication',
        '@id': `${window.location.origin}/#webapp`,
        'name': 'Antiauc - Antique Bidding Marketplace',
        'applicationCategory': 'AuctionApplication',
        'operatingSystem': 'All modern web browsers',
        'description':
          'Verified antique bidding marketplace with live bidding, provenance authentication, and secure private deal chats.',
        'offers': {
          '@type': 'AggregateOffer',
          'priceCurrency': 'LKR',
          'lowPrice': '300',
          'offerCount': items.length.toString()
        }
      }
    ];

    // If an item is currently selected, add rich Product & BreadcrumbList schemas
    if (selectedItem) {
      const currentPrice = selectedItem.currentBid || selectedItem.startingBid;
      const isActive = selectedItem.status === 'active';

      const publicImages = (selectedItem.images || [])
        .map(resolvePublicImageUrl)
        .filter((url, idx, arr) => arr.indexOf(url) === idx);

      schemaGraph.push({
        '@type': 'Product',
        '@id': `${window.location.origin}/#product-${selectedItem.id}`,
        'name': selectedItem.title,
        'description': selectedItem.provenance || `${selectedItem.title} - ${selectedItem.era} antique lot (${selectedItem.condition}).`,
        'image': publicImages.length > 0 ? publicImages : [ogImage],
        'category': selectedItem.category,
        'productionDate': selectedItem.era,
        'itemCondition': 'https://schema.org/UsedCondition',
        'offers': {
          '@type': 'Offer',
          'priceCurrency': 'LKR',
          'price': currentPrice.toString(),
          'availability': isActive ? 'https://schema.org/InStock' : 'https://schema.org/SoldOut',
          'url': canonicalUrl,
          'seller': {
            '@type': 'Person',
            'name': selectedItem.sellerName
          }
        }
      });

      schemaGraph.push({
        '@type': 'BreadcrumbList',
        '@id': `${window.location.origin}/#breadcrumb`,
        'itemListElement': [
          {
            '@type': 'ListItem',
            'position': 1,
            'name': 'Home',
            'item': window.location.origin
          },
          {
            '@type': 'ListItem',
            'position': 2,
            'name': selectedItem.category,
            'item': `${window.location.origin}/?category=${encodeURIComponent(selectedItem.category)}`
          },
          {
            '@type': 'ListItem',
            'position': 3,
            'name': selectedItem.title,
            'item': canonicalUrl
          }
        ]
      });
    } else {
      // Default ItemList schema for search engines indexing catalog items
      const activeItems = items.filter(it => it.status === 'active').slice(0, 10);
      if (activeItems.length > 0) {
        schemaGraph.push({
          '@type': 'ItemList',
          '@id': `${window.location.origin}/#featured-lots`,
          'name': 'Curated Antique Lots Available for Bidding',
          'numberOfItems': activeItems.length,
          'itemListElement': activeItems.map((lot, idx) => ({
            '@type': 'ListItem',
            'position': idx + 1,
            'item': {
              '@type': 'Product',
              'name': lot.title,
              'description': lot.provenance ? lot.provenance.slice(0, 100) : lot.title,
              'image': resolvePublicImageUrl(Array.isArray(lot.images) ? lot.images[0] : undefined),
              'category': lot.category,
              'offers': {
                '@type': 'Offer',
                'priceCurrency': 'LKR',
                'price': (lot.currentBid || lot.startingBid).toString(),
                'availability': 'https://schema.org/InStock'
              }
            }
          }))
        });
      }
    }

    // 5. Inject or update the application/ld+json script tag in <head>
    let ldJsonScript = document.getElementById('antiauc-schema-structured-data') as HTMLScriptElement | null;
    if (!ldJsonScript) {
      ldJsonScript = document.createElement('script');
      ldJsonScript.id = 'antiauc-schema-structured-data';
      ldJsonScript.type = 'application/ld+json';
      document.head.appendChild(ldJsonScript);
    }
    ldJsonScript.textContent = JSON.stringify({
      '@context': 'https://schema.org',
      '@graph': schemaGraph
    }, null, 2);

  }, [selectedItem, activeNavTab, selectedCategory, searchQuery, items, formatCurrency]);

  return null; // Purely side-effect headless component for SEO
};
