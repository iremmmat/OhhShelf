import { getLanguage, setLanguage, t } from '../lib/i18n'

function LanguageToggle() {
  const currentLang = getLanguage()

  function handleLanguageChange(lang) {
    setLanguage(lang)
    window.location.reload()
  }

  return (
    <div className="language-toggle" role="group" aria-label="Language selection">
      <button
        type="button"
        className={currentLang === 'en' ? 'active' : ''}
        onClick={() => handleLanguageChange('en')}
      >
        EN
      </button>
      <button
        type="button"
        className={currentLang === 'fr' ? 'active' : ''}
        onClick={() => handleLanguageChange('fr')}
      >
        FR
      </button>
      <button
        type="button"
        className={currentLang === 'tr' ? 'active' : ''}
        onClick={() => handleLanguageChange('tr')}
      >
        TR
      </button>
    </div>
  )
}

export default LanguageToggle
