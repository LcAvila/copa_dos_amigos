export function arquivoParaBase64(arquivo) {
  return new Promise((resolve, reject) => {
    const leitor = new FileReader()
    leitor.onload = () => resolve(String(leitor.result).split(',')[1] ?? '')
    leitor.onerror = () => reject(new Error('Não foi possível ler o arquivo.'))
    leitor.readAsDataURL(arquivo)
  })
}

export function limitarArquivo(arquivo) {
  const tiposPermitidos = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
  if (!tiposPermitidos.includes(arquivo.type)) {
    return 'Formato não suportado. Use JPG, PNG, WEBP ou GIF.'
  }
  if (arquivo.size > 2_500_000) {
    return 'Imagem muito grande. O limite é 2,5 MB.'
  }
  return null
}
