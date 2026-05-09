import React from 'react';

function Shelf({ entries, onClose }) {
  return (
    <div className="modal-overlay" style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, 
      backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 1000, 
      display: 'flex', justifyContent: 'center', alignItems: 'center',
      backdropFilter: 'blur(4px)'
    }}>
      <div className="modal-content shelf-modal" style={{
        backgroundColor: '#faf9f8', width: '90%', maxWidth: '900px', 
        maxHeight: '85vh', borderRadius: '16px', display: 'flex', flexDirection: 'column',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
      }}>
        
        {/* Başlık ve Kapatma Butonu */}
        <header style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center', 
          padding: '24px 30px', borderBottom: '1px solid #e5e7eb', backgroundColor: '#fff',
          borderTopLeftRadius: '16px', borderTopRightRadius: '16px'
        }}>
          <h2 style={{ margin: 0, color: '#111827', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '1.4rem' }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#C96F35" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"></path>
            </svg>
            Öğrendiklerim
          </h2>
          <button onClick={onClose} style={{
            background: '#f3f4f6', border: 'none', width: '36px', height: '36px', borderRadius: '50%',
            display: 'flex', justifyContent: 'center', alignItems: 'center',
            cursor: 'pointer', color: '#4b5563', transition: 'all 0.2s'
          }}>✕</button>
        </header>
        
        {/* Kartların Listelendiği Alan */}
        <div style={{ padding: '30px', overflowY: 'auto', flex: 1 }}>
          {entries.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 0', color: '#6b7280', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <img src="/empty-shelf.png" alt="Boş Raf" style={{ width: '220px', marginBottom: '20px', opacity: 0.9, mixBlendMode: 'multiply' }} />
              <p style={{ fontSize: '1.1rem', maxWidth: '400px', lineHeight: '1.6' }}>Rafın şu an boş. Merak ettiğin yeni konuları araştırıp günlüğe kaydettikçe hepsi burada birikecek!</p>
            </div>
          ) : (
            <div style={{ 
              display: 'grid', gap: '24px', 
              gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' 
            }}>
              {entries.map((entry, index) => (
                <div key={index} style={{ 
                  border: '1px solid #f3f4f6', borderRadius: '12px', 
                  padding: '24px', backgroundColor: '#fff',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
                  borderTop: '4px solid #C96F35', cursor: 'default'
                }}>
                  <h3 style={{ marginTop: 0, marginBottom: '8px', color: '#111827', fontSize: '1.15rem' }}>
                    {entry.title || entry.topic || entry.thoughtText || 'İsimsiz Keşif'}
                  </h3>
                  <p style={{ fontSize: '0.8rem', color: '#9ca3af', marginBottom: '16px', fontWeight: '500' }}>
                    {entry.date ? new Date(entry.date).toLocaleDateString() : 'Yakın zamanda'}
                  </p>
                  <p style={{ fontSize: '0.95rem', color: '#4b5563', lineHeight: '1.6', margin: 0 }}>
                    {entry.notes || entry.reflection || 'Not eklenmedi...'}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Shelf;