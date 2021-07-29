import Linter from 'eslint/lib/linter'
import eslintRecommended from 'eslint/conf/eslint-recommended'

Linter.DEFAULT_RECOMMENDED_RULES = Object.assign({}, eslintRecommended)

export default Linter
