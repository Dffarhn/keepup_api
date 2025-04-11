import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { StatistikKuisioner } from '../common/interfaces/StatistikKuisioner.interface';
import {
  Background,
  PreKuisionerAnswer,
  ReportData,
  SymptomResult,
} from '../take-kuisioner/take-kuisioner.model';

@Injectable()
export class AikeepUpService {
  private openai: OpenAI;
  private openAiModel: string;
  private maxTokens: number;
  private temperature: number;

  constructor(private configService: ConfigService) {
    this.openai = new OpenAI({
      apiKey: this.configService.get<string>('openai.apiKey'),
    });
    // Load configuration once in the constructor for better efficiency
    this.openAiModel = this.configService.get<string>('openai.model');
    this.maxTokens = this.configService.get<number>('openai.maxTokens');
    this.temperature = this.configService.get<number>('openai.temperature');
  }

  // Private function for making OpenAI chat completions requests
  private async openAiRequest(
    prompt: string,
    systemMessage: string,
  ): Promise<string> {
    try {
      const response = await this.openai.chat.completions.create({
        model: this.openAiModel,
        messages: [
          {
            role: 'system',
            content: systemMessage,
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        max_tokens: this.maxTokens,
        temperature: this.temperature,
      });

      return response.choices[0].message.content.trim();
    } catch (error) {
      throw new Error(`OpenAI request failed: ${error.message}`);
    }
  }

  async generateSumarize(data: StatistikKuisioner): Promise<string> {
    try {
      const gptPrompt = `
    Berikut adalah hasil kuisioner yang berisi data terkait gejala-gejala Stress, Depresi, Prokrastinasi, Kecanduan Ponsel, dan Kecemasan yang dialami oleh para responden. Harap berikan ringkasan yang padat dan jelas mengenai temuan utama yang relevan untuk pemangku kepentingan, dengan penekanan pada pola umum gejala dan tingkat keparahannya.

    Data Kuisioner:
    ${data.UserSymptomStatistics.map(
        (kuisioner, index) => `
    Responden ${index + 1}:
    - Kuisioner: ${kuisioner.kuisionerName}
    - Gejala yang Teramati:
    ${Object.entries(kuisioner.symptoms)
            .map(
              ([symptom, details]) => `
        -- ${symptom}: 
          --- Tingkat Keparahan: ${details.level}`,
            )
            .join('\n')}`,
      ).join('\n\n')}

    Instruksi untuk merangkum:  
    1. Berikan jumlah pengisi.
    2. Fokus pada gejala-gejala dengan tingkat keparahan tertinggi yang muncul secara konsisten di antara para responden.
    3. Identifikasi pola umum gejala dan prevalensinya di seluruh responden.
    4. Berikan analisis yang jelas tentang temuan utama dan gambaran umum mengenai gejala yang perlu mendapat perhatian lebih.
    5. Tulis ringkasan dengan bahasa profesional, singkat, dan langsung ke pokok permasalahan, tanpa menyebutkan nama responden atau informasi pribadi.
    6. Hindari penjelasan yang bertele-tele, cukup fokus pada temuan penting dan kesimpulan yang relevan untuk pengambilan keputusan.

    Ringkasan ini harus disusun dengan cara yang mudah dipahami oleh manajer atau atasan yang memerlukan informasi utama untuk analisis lebih lanjut dan tindakan yang tepat.

    `;

      const gptSystem = `
        Anda adalah asisten yang terlatih dalam menganalisis dan merangkum data hasil kuisioner. Tujuan Anda adalah memberikan ringkasan yang terstruktur, profesional, dan mudah dipahami terkait gejala-gejala seperti Stress, Depresi, Prokrastinasi, Kecanduan Ponsel, dan Kecemasan. Pastikan rangkuman mencakup:
        1. Gejala-gejala utama yang perlu menjadi perhatian pemilik kuisioner berdasarkan tingkat keparahan dan frekuensinya.
        2. Pola gejala yang sering muncul di antara seluruh responden.
        3. Kesimpulan atau rekomendasi yang dapat membantu pihak yang bertanggung jawab untuk memahami data ini lebih baik.
        Gunakan bahasa yang sopan, profesional, dan jelas, dengan fokus pada analisis umum dan pola gejala tanpa menyebutkan nama atau informasi spesifik responden.

        `;

      return await this.openAiRequest(gptPrompt, gptSystem);
    } catch (error) {
      console.error('Error generating summary:', error);
      throw new Error('Gagal menghasilkan ringkasan. Mohon coba lagi nanti.');
    }
  }

  async generateReport(data: ReportData): Promise<string> {
    try {
      const gptPrompt =` 
      Buatkan laporan psikologi hasil asesmen berupa skrining kesehatan mental mahasiswa.  Skrining terdiri dari data stres, depresi, kecemasan dari skala DASS.  Ditambah data skala prokrastinasi akademik, kecanduan ponsel, dan regulasi diri. Selain itu ada data riwayat kesehatan masalah berat, dukungan keluarga, kondisi finansial, masalah dengan dosen/kampus, orangtua, teman, saudara, riwayat apakah pernah alami masalah berat sehingga datang ke psikolog/psikiater. \n
      Buat laporan dengan bahasa yang mudah dipahami orang awam dengan elemen: deskripsi kondisi mahasiswa, dampaknya bagi mahasiswa, rekomendasi singkat apa yang perlu dilakukan mahasiswa tersebut. Hasil analisis harus berupa teks biasa tanpa format khusus, disusun dalam 5 paragraf.  Gunakan kata sapaan “Kamu”. \n
      Paragraf pertama menjelaskan tingkat stres, depresi, kecemasan berdasarkan skor yang diperoleh.  Tanpa perlu menuliskan skor. lengkapi dengan elaborasi gejala atau simptom yang muncul.  elaborasi apa dampak dari tingkat stres, depresi, kecemasan itu pada konteks klien sebagai mahasiswa. \n
      Paragraf kedua menjelaskan tingkat prokrastinasi, kecanduan ponsel, dan regulasi diri berdasarkan skor yang diperoleh.  Lengkapi dengan elaborasi gejala atau simptom yang muncul. Elaborasi apa dampak dari tingkat prokrastinasi, kecanduan ponsel, regulasi diri itu pada konteks klien sebagai mahasiswa. \n
      Paragraf ketiga menjelaskan faktor resiko kesehatan mental berdasarkan data riwayat kesehatan masalah berat, dukungan keluarga, kondisi finansial, masalah dengan dosen/kampus, orangtua, teman, saudara, riwayat apakah pernah alami masalah berat sehingga datang ke psikolog/psikiater.  Elaborasikan kondisi individu itu dikaitkan dengan ada atau tidaknya resiko masalah kesehatan mental atau faktor protektif yang ada pada konteks klien sebagai mahasiswa. \n
      Paragraf keempat menjelaskan Kesimpulan secara keseluruhan dengan mempertimbangkan dan integrasikan semua data dari paragraf 1-3 sebelumnya dengan sistematis logis.  Elaborasi keterkaitan semua data itu.  Berikan Kesimpulan akhir seberapa besar resiko muncul masalah kesehatan mental. Bila ada, Apa dampaknya? Berikan subjudul “Kesimpulan” khusus pada paragraf ini. Kata kesimpulan ditulis terpisah dari paragraf 4.  \n
      Paragraf kelima, menjelaskan rekomendasi yang praktis berdasarkan masalah pada paragraf 1-4 sebelumnya. Tulis dengan panjang kata sekitar 500-600 kata.
    
              \n  ### Data untuk Analisis:
            Latar Belakang:
            ${data.background
          .map(
            (item) => `
              - Kategori: ${item.categoryName}
              ${item.preKuisionerAnswer
                .map(
                  (dataBackground) => `
                - Pertanyaan: ${dataBackground.question}
                - Jawaban: ${dataBackground.answer}`,
                )
                .join('\n')}
              `,
          )
          .join('\n')}
      
            Data:
            ${data.result
          .map(
            (item) => `
              - Nama: ${item.nameSymtomp}
              - Tingkat: ${item.level}
              - Skor: ${item.score}`,
          )
          .join('\n')}`;


      console.log(gptPrompt)

      const gptSystem =
        'You are a highly skilled psychologist specializing in analyzing patient conditions based on questionnaire responses. Your role is to generate detailed, empathetic, and well-structured psychological analysis reports based on the provided data. Your reports should offer in-depth insights into each symptom, its potential effects, and recommendations for intervention, using a formal and empathetic tone suitable for patients and their needs. Please ensure the output is plain text, with no special formatting such as **bold**.';

      // Extract and format the response content, ensuring plain text output
      const generatedReport = await this.openAiRequest(gptPrompt, gptSystem);
      return generatedReport;
    } catch (error) {
      console.error('Error generating report from OpenAI:', error);
      throw new Error(
        `Failed to generate report from OpenAI: ${error.message}`,
      );
    }
  }

  async generateReportTesting(
    data: ReportData,
    gptPromptTesting: string,
    gptSystemTesting: string,
  ): Promise<string> {
    try {
      const gptPrompt =
        gptPromptTesting +
        `       
        \n  ### Data untuk Analisis:
      Latar Belakang:
      ${data.background
          .map(
            (item) => `
        - Kategori: ${item.categoryName}
        ${item.preKuisionerAnswer
                .map(
                  (dataBackground) => `
          - Pertanyaan: ${dataBackground.question}
          - Jawaban: ${dataBackground.answer}`,
                )
                .join('\n')}
        `,
          )
          .join('\n')}

      Data:
      ${data.result
          .map(
            (item) => `
        - Nama: ${item.nameSymtomp}
        - Tingkat: ${item.level}
        - Skor: ${item.score}`,
          )
          .join('\n')}`;

      const gptSystem = gptSystemTesting;

      console.log(gptPrompt);
      console.log(gptSystem);
      // Extract and format the response content, ensuring plain text output
      const generatedReport = await this.openAiRequest(gptPrompt, gptSystem);
      return generatedReport;
    } catch (error) {
      console.error('Error generating report from OpenAI:', error);
      throw new Error(
        `Failed to generate report from OpenAI: ${error.message}`,
      );
    }
  }
}
