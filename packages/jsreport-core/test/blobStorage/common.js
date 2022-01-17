module.exports = (storage) => {
  it('write and read', async () => {
    await storage().write('foo', Buffer.from('hula'))

    const content = await storage().read('foo')
    content.toString().should.be.eql('hula')
  })

  it('write remove read should fail', async () => {
    await storage().write('foo', Buffer.from('hula'))
    await storage().remove('foo')

    return storage().read('foo').should.be.rejected()
  })

  it('should work with folders and paths', async () => {
    await storage().write('foldera/folderb/myblob.txt', Buffer.from('hula'))
    const buf = await storage().read('foldera/folderb/myblob.txt')
    buf.toString().should.be.eql('hula')
  })

  it('remove shouldnt fail for missing blob', async () => {
    await storage().remove('foo')
  })
}
