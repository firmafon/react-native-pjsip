require 'json'

package = JSON.parse(File.read(File.join(__dir__, 'package.json')))

Pod::Spec.new do |s|
  s.name                   = 'RNPjSip'
  s.version                = package['version']
  s.summary                = package['description']
  s.homepage               = package['homepage']
  s.license                = package['license'] || 'unknown'
  s.author                 = 'Vadim Ruban'
  s.source                 = { git: 'https://github.com/relatel/react-native-pjsip', branch: 'relatel' }
  s.platforms              = { ios: '9.0' }
  s.preserve_paths         = 'package.json', 'LICENSE.txt'
  s.cocoapods_version      = '>= 1.2.0'

  s.dependency 'React-Core'
end
